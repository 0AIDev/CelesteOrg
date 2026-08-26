import { createAdminClient } from "@/lib/supabase/admin";

type NotificationType = "approval" | "idea" | "invite" | "report" | "system" | "dm";

// Server-side notification writer (admin client — users can't insert).
// Non-fatal by design: a failed notification must never break the action
// that triggered it.
export async function notify(
  recipientId: string | null | undefined,
  type: NotificationType,
  title: string,
  body?: string,
  targetId?: string,
) {
  if (!recipientId) return;
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      recipient_id: recipientId,
      type,
      title,
      body: body ?? null,
      target_id: targetId ?? null,
    });
  } catch {
    // swallow — notifications are best-effort
  }
}

// Notify everyone flagged as founder (used for "new idea" style broadcasts).
export async function notifyFounders(
  type: NotificationType,
  title: string,
  body?: string,
  targetId?: string,
) {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("is_founder", true);
    for (const p of data ?? []) {
      await notify(p.id, type, title, body, targetId);
    }
  } catch {
    // swallow
  }
}