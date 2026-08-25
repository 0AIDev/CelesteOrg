"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

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

// First-founder bootstrap. Delegates to a revocable, once-only SQL rule so
// it can't become a later self-promotion vector.
export async function bootstrapFounderAction(): Promise<
  | { ok: true; claimed: boolean }
  | { ok: false; error: string }
> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("bootstrap_first_founder");
    if (error) return { ok: false, error: error.message };
    return { ok: true, claimed: data === true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bootstrap failed";
    return { ok: false, error: msg };
  }
}

export async function bootstrapFounderStatus(): Promise<{
  isFounder: boolean;
  isAdmin: boolean;
  anyFounderExists: boolean;
}> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isFounder: false, isAdmin: false, anyFounderExists: true };

  const admin = createAdminClient();
  const [{ data: me }, { data: founders }] = await Promise.all([
    admin.from("profiles").select("is_founder, created_at").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("id").eq("is_founder", true).limit(1),
  ]);
  const isFounder = me?.is_founder === true;
  const isAdmin = user.app_metadata?.role === "admin";
  const anyFounderExists = (founders?.length ?? 0) > 0;
  return { isFounder, isAdmin, anyFounderExists };
}

export type InviteRow = {
  id: string;
  email: string;
  role_title: string | null;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  departmentName: string | null;
};

export async function getInvites(): Promise<
  | { ok: true; invites: InviteRow[] }
  | { ok: false; error: string }
> {
  try {
    if (!(await isFounderOrAdmin())) {
      return { ok: false, error: "Only founders and admins can view invites." };
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("invites")
      .select("id, email, role_title, status, created_at, department:departments(name)")
      .order("created_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      invites: (data ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        role_title: i.role_title,
        status: i.status,
        created_at: i.created_at,
        departmentName:
          (i.department as unknown as { name?: string } | null)?.name ?? null,
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load invites";
    return { ok: false, error: msg };
  }
}

export async function revokeInvite(id: string): Promise<
  | { ok: true }
  | { ok: false; error: string }
> {
  try {
    if (!(await isFounderOrAdmin())) {
      return { ok: false, error: "Only founders and admins can revoke invites." };
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("invites")
      .update({ status: "revoked" })
      .eq("id", id)
      .eq("status", "pending");
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not revoke invite";
    return { ok: false, error: msg };
  }
}

export async function resendInvite(id: string): Promise<
  | { ok: true; link?: string }
  | { ok: false; error: string }
> {
  try {
    if (!(await isFounderOrAdmin())) {
      return { ok: false, error: "Only founders and admins can resend invites." };
    }
    const admin = createAdminClient();
    const { data: invite, error: findErr } = await admin
      .from("invites")
      .select("id, email, token, status")
      .eq("id", id)
      .maybeSingle();
    if (findErr || !invite) return { ok: false, error: "Invite not found." };
    if (invite.status !== "pending") {
      return { ok: false, error: "Only pending invites can be resent." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Land on the client callback first: it exchanges the magic-link hash for
    // a server-visible session, then forwards to the invite completion page.
    const next = encodeURIComponent(`/invite/complete?invite=${invite.token}`);
    const redirectTo = `${appUrl}/auth/callback?next=${next}`;
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: invite.email,
      options: { redirectTo },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, link: linkData?.properties?.action_link };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resend invite";
    return { ok: false, error: msg };
  }
}

// Public-listed departments for the invite form (RLS: select allowed for auth).
export async function getDepartments(): Promise<
  { ok: true; departments: { id: string; name: string }[] } | { ok: false; error: string }
> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("departments")
      .select("id, name")
      .order("name");
    if (error) return { ok: false, error: error.message };
    return { ok: true, departments: data ?? [] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load departments";
    return { ok: false, error: msg };
  }
}

// Server-side privilege check: founder (from profiles) OR admin (JWT claim).
// RLS on `invites` also enforces this, but we gate before mutating anything.
async function isFounderOrAdmin(): Promise<boolean> {
  const supabase = userClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_founder")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.is_founder === true;
}

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  departmentId: z.string().uuid().optional(),
  roleTitle: z.string().min(1, "Position is required").max(120),
});

export async function inviteTeammate(
  input: Record<string, unknown>,
): Promise<
  ActionResult & { link?: string; token?: string; email?: string }
> {
  try {
    const parsed = inviteSchema.parse(input);
    const email = parsed.email.toLowerCase();

    if (!(await isFounderOrAdmin())) {
      return { ok: false, error: "Only founders and admins can invite teammates." };
    }

    const cookieStore = cookies();
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const inviterId = user?.id;

    const admin = createAdminClient();

    // A unique constraint lives on invites(email). Handle re-invites cleanly:
    //   - accepted  → the person is already a member
    //   - pending   → reuse the row, refresh the role and regenerate the link
    //   - revoked   → revive the row with the new role/department
    let inviteId: string | undefined;
    let token: string | undefined;
    const { data: existing } = await admin
      .from("invites")
      .select("id, status, token")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      if (existing.status === "accepted") {
        return { ok: false, error: "This email is already a team member." };
      }
      const { data: refreshed, error: upErr } = await admin
        .from("invites")
        .update({
          status: "pending",
          role_title: parsed.roleTitle,
          department_id: parsed.departmentId,
          invited_by: inviterId,
        })
        .eq("id", existing.id)
        .select("id, token")
        .single();
      if (upErr) return { ok: false, error: upErr.message };
      inviteId = refreshed.id;
      token = refreshed.token;
    } else {
      // Create the tracked invite row first (gives us our own immutable token).
      const { data: invite, error: inviteErr } = await admin
        .from("invites")
        .insert({
          email,
          department_id: parsed.departmentId,
          role_title: parsed.roleTitle,
          invited_by: inviterId,
        })
        .select("token, id")
        .single();
      if (inviteErr) return { ok: false, error: inviteErr.message };
      inviteId = invite.id;
      token = invite.token;
    }

    // Generate a full magic-link URL (works without SMTP configured). Land on
    // the client callback first so the hash session becomes server-visible,
    // then forward to the invite completion page.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const next = encodeURIComponent(`/invite/complete?invite=${token}`);
    const redirectTo = `${appUrl}/auth/callback?next=${next}`;

    const { data: linkData, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      // Cleanup the invite row so a retry is clean.
      await admin.from("invites").delete().eq("id", inviteId).is("status", "pending");
      return { ok: false, error: linkError.message };
    }

    const actionLink = linkData?.properties?.action_link as string | undefined;
    if (!actionLink) {
      await admin.from("invites").delete().eq("id", inviteId).is("status", "pending");
      return { ok: false, error: "Could not build invite link." };
    }

    revalidatePath("/teams");
    return { ok: true, link: actionLink, token, email };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not create invite";
    return { ok: false, error: msg };
  }
}

const acceptSchema = z.object({
  token: z.string().min(1),
});

// Called from the /invite/complete route after the invited person authenticates.
// Assigns their department + creates a role, then marks the invite accepted.
export async function acceptInvite(
  input: Record<string, unknown>,
): Promise<ActionResult & { name?: string }> {
  try {
    const parsed = acceptSchema.parse(input);

    // Resolve the authenticated user's identity server-side.
    const supabase = userClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { ok: false, error: "Authenticate first to accept an invite." };

    const admin = createAdminClient();

    const { data: invite, error: findErr } = await admin
      .from("invites")
      .select("id, email, department_id, role_title, status, token, invited_by")
      .eq("token", parsed.token)
      .maybeSingle();
    if (findErr || !invite) return { ok: false, error: "Invite not found." };
    if (invite.status !== "pending") {
      return { ok: false, error: "This invite has already been used." };
    }
    // Only the invited email may accept.
    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return { ok: false, error: "This invite was issued for a different email." };
    }

    // Assign department on the caller's profile.
    if (invite.department_id) {
      const { error: deptErr } = await admin
        .from("profiles")
        .update({ department_id: invite.department_id })
        .eq("id", user.id);
      if (deptErr) return { ok: false, error: deptErr.message };
    }

    // Create a role so the person shows on the org chart immediately, under
    // the CEO (the root role). The invited position is the one chosen by the
    // founder at invite time.
    const { data: rootRole } = await admin
      .from("roles")
      .select("id")
      .is("reports_to", null)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const { error: roleErr } = await admin.from("roles").insert({
      profile_id: user.id,
      title: invite.role_title || "Teammate",
      department_id: invite.department_id,
      reports_to: rootRole?.id ?? null,
      level: 5,
    });
    if (roleErr) return { ok: false, error: roleErr.message };

    // Mark accepted + audit.
    const { error: upErr } = await admin
      .from("invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invite.id);
    if (upErr) return { ok: false, error: upErr.message };

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "invite.accepted",
      target_id: invite.id,
      meta: { email: user.email },
    });

    await notify(
      invite.invited_by,
      "invite",
      `${user.email} accepted the invite`,
      invite.role_title || "Teammate",
      invite.id,
    );

    revalidatePath("/teams");
    revalidatePath("/org-chart");
    return { ok: true, name: user.user_metadata?.full_name as string | undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not accept invite";
    return { ok: false, error: msg };
  }
}