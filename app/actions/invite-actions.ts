"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { requirePermission } from "@/app/actions/permission-actions";

type ActionResult = { ok: true } | { ok: false; error: string };

/** Detect the app base URL — works in both dev and production. */
function getBaseUrl(): string {
  // Explicit override (set in Vercel env vars)
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Auto-detect from request headers (server-side)
  try {
    const { headers } = require("next/headers");
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    /* not in server context */
  }
  return "http://localhost:3000";
}

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
      .select("id, email, token, status, role_title")
      .eq("id", id)
      .maybeSingle();
    if (findErr || !invite) return { ok: false, error: "Invite not found." };
    if (invite.status !== "pending") {
      return { ok: false, error: "Only pending invites can be resent." };
    }

    const appUrl = getBaseUrl();
    const inviteLink = `${appUrl}/invito?token=${invite.token}`;
    await sendInviteEmail(invite.email, inviteLink, invite.role_title);
    return { ok: true, link: inviteLink };
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

    // Founders/admins bypass; other members need the invites.send grant.
    if (!(await requirePermission("invites.send"))) {
      return { ok: false, error: "You don't have permission to invite teammates." };
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

    // Build a custom invite link (no Supabase magic link).
    const appUrl = getBaseUrl();
    const inviteLink = `${appUrl}/invito?token=${token}`;

    // Send the invite email via Resend.
    await sendInviteEmail(email, inviteLink, parsed.roleTitle);

    revalidatePath("/teams");
    return { ok: true, link: inviteLink, token, email };
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

    // Assign department + role + onboarding flag on the caller's profile.
    const profileUpdate: Record<string, unknown> = {
      onboarding_completed: false,
    };
    if (invite.department_id) profileUpdate.department_id = invite.department_id;
    if (invite.role_title) profileUpdate.role_title = invite.role_title;
    const { error: deptErr } = await admin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", user.id);
    if (deptErr) return { ok: false, error: deptErr.message };

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

export type InviteDetails = {
  email: string | null;
  department_id: string | null;
  department_name: string | null;
  role_title: string | null;
};

// Public lookup: returns the invite details (email, assigned department and
// role) for a token. Used by the onboarding page to pre-fill the read-only
// email field and the already-assigned department/role.
export async function getInviteDetails(token: string): Promise<InviteDetails | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("invites")
      .select("email, department_id, role_title, departments(name)")
      .eq("token", token)
      .maybeSingle();
    if (!data) return null;
    return {
      email: data.email ?? null,
      department_id: data.department_id ?? null,
      role_title: data.role_title ?? null,
      department_name:
        (data.departments as unknown as { name?: string } | null)?.name ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Email helper ────────────────────────────────────────────────────────────

async function sendInviteEmail(
  to: string,
  inviteLink: string,
  roleTitle?: string | null,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    console.warn("[invite] RESEND_API_KEY or RESEND_FROM_EMAIL not set — email not sent");
    return;
  }

  const roleLine = roleTitle ? ` as <strong>${roleTitle}</strong>` : '';

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: "You're invited to join Celeste HQ",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="font-size: 24px; font-weight: 600; color: #111; margin-bottom: 8px;">You're invited to Celeste HQ</h1>
            <p style="font-size: 15px; color: #555; line-height: 1.6; margin-bottom: 24px;">
              You've been invited${roleLine} to join the Celeste HQ workspace.
              Click the button below to accept and set up your account.
            </p>
            <a href="${inviteLink}" style="display: inline-block; background: #111; color: #fff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none; margin-bottom: 24px;">
              Accept Invite
            </a>
            <p style="font-size: 13px; color: #999; line-height: 1.5;">
              This link will expire in 7 days. If you weren't expecting this invite, you can safely ignore this email.
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error("[invite] Failed to send email:", err);
  }
}