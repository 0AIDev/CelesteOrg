"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PermissionKey } from "@/lib/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

function userClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
}

// ─── Guards ────────────────────────────────────────────────────────────────

type AdminState = {
  userId: string;
  isFounder: boolean;
  isAdmin: boolean;
};

async function requireManager(): Promise<AdminState> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founder")
    .eq("id", user.id)
    .maybeSingle();
  const isFounder = profile?.is_founder === true;
  const isAdmin = user.app_metadata?.role === "admin";
  if (!isFounder && !isAdmin) {
    throw new Error("Only founders and admins can manage permissions");
  }
  return { userId: user.id, isFounder, isAdmin };
}

// ─── Read ──────────────────────────────────────────────────────────────────

export type TeamPermissionRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  role_title: string | null;
  is_founder: boolean;
  is_admin: boolean;
  permissions: Partial<Record<PermissionKey, boolean>>;
};

export async function getTeamPermissions(): Promise<
  ActionResult & { members?: TeamPermissionRow[] }
> {
  try {
    await requireManager();
    const supabase = userClient();
    const admin = createAdminClient();

    const [{ data: profiles }, { data: perms }, { data: authUsers }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, role_title, is_founder")
          .order("full_name", { ascending: true }),
        supabase
          .from("user_permissions")
          .select("user_id, feature, allowed"),
        admin.auth.admin.listUsers({ perPage: 200 }),
      ]);

    const adminIds = new Set(
      (authUsers?.users ?? [])
        .filter((u) => u.app_metadata?.role === "admin")
        .map((u) => u.id),
    );

    const byUser = new Map<string, Partial<Record<PermissionKey, boolean>>>();
    for (const p of perms ?? []) {
      const map = byUser.get(p.user_id) ?? {};
      map[p.feature as PermissionKey] = p.allowed;
      byUser.set(p.user_id, map);
    }

    const members: TeamPermissionRow[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      email: p.email,
      role_title: p.role_title,
      is_founder: p.is_founder,
      is_admin: adminIds.has(p.id),
      permissions: byUser.get(p.id) ?? {},
    }));

    return { ok: true, members };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load permissions";
    return { ok: false, error: msg };
  }
}

// ─── Writes ────────────────────────────────────────────────────────────────

export async function setUserPermission(
  userId: string,
  feature: string,
  allowed: boolean,
): Promise<ActionResult> {
  try {
    const me = await requireManager();
    // Admins can't re-grant themselves — only the founder (or another admin)
    // may edit a given member's rows.
    if (userId === me.userId) {
      return { ok: false, error: "You cannot change your own permissions" };
    }
    const supabase = userClient();
    const { error } = await supabase.from("user_permissions").upsert(
      {
        user_id: userId,
        feature,
        allowed,
        updated_by: me.userId,
      },
      { onConflict: "user_id,feature" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update permission";
    return { ok: false, error: msg };
  }
}

export async function setUserRole(
  userId: string,
  roleTitle: string,
): Promise<ActionResult> {
  try {
    await requireManager();
    const supabase = userClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role_title: roleTitle.trim() ? roleTitle.trim() : null })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    revalidatePath("/org-chart");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update role";
    return { ok: false, error: msg };
  }
}

export async function setFounderStatus(
  userId: string,
  isFounder: boolean,
): Promise<ActionResult> {
  try {
    const me = await requireManager();
    // Only the founder themselves decides who else is a founder — admins can't
    // demote or promote founders.
    if (!me.isFounder) {
      return { ok: false, error: "Only the founder can change founder status" };
    }
    // Nobody can demote themselves — you'd lock the company out of founder powers.
    if (userId === me.userId) {
      return { ok: false, error: "You cannot change your own founder status" };
    }
    const supabase = userClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_founder: isFounder })
      .eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    revalidatePath("/org-chart");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update founder status";
    return { ok: false, error: msg };
  }
}

export async function setAdminStatus(
  userId: string,
  isAdmin: boolean,
): Promise<ActionResult> {
  try {
    const me = await requireManager();
    // Only the founder decides who is admin — prevents admin escalation loops.
    if (!me.isFounder) {
      return { ok: false, error: "Only the founder can change admin status" };
    }
    // Same self-lockout guard for the admin claim.
    if (userId === me.userId) {
      return { ok: false, error: "You cannot change your own admin status" };
    }
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role: isAdmin ? "admin" : null },
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update admin status";
    return { ok: false, error: msg };
  }
}

export async function removeUserFromWorkspace(
  userId: string,
): Promise<ActionResult> {
  try {
    const me = await requireManager();
    if (userId === me.userId) {
      return { ok: false, error: "You cannot remove yourself from the workspace" };
    }
    // Check the target is not a founder
    const supabase = userClient();
    const { data: target } = await supabase
      .from("profiles")
      .select("is_founder, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (target?.is_founder) {
      return { ok: false, error: "Cannot remove a founder from the workspace" };
    }
    // Remove role from org chart
    await supabase.from("roles").delete().eq("profile_id", userId);
    // Log the removal
    await supabase.from("audit_log").insert({
      actor_id: me.userId,
      action: "member.removed",
      target_id: userId,
      meta: { removed_name: target?.full_name ?? "Unknown" },
    });
    // Delete auth account (cascades to profiles via FK)
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    revalidatePath("/org-chart");
    revalidatePath("/dashboards");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not remove user";
    return { ok: false, error: msg };
  }
}

// ─── Enforcement helper (used by every gated server action) ────────────────
// Only founders bypass the matrix (like Discord's owner). Admins are subject
// to feature toggles like everyone else. Missing row = allowed (default-open,
// restrict-only).

export async function requirePermission(feature: PermissionKey): Promise<boolean> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_founder")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_founder) return true;

  const { data: row } = await supabase
    .from("user_permissions")
    .select("allowed")
    .eq("user_id", user.id)
    .eq("feature", feature)
    .maybeSingle();

  return row ? row.allowed : true;
}
