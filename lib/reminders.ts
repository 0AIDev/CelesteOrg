import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

/**
 * Finds send-for-signature requests still pending after `days` days and
 * nudges the signers: an in-app notification (always) plus an email via
 * Resend when RESEND_API_KEY + RESEND_FROM_EMAIL are configured.
 *
 * Used by:
 *  - the pg_cron job (POST /api/reminders, WEBHOOK_SECRET auth)
 *  - the "Remind" button in the document preview (owner-triggered)
 */
export async function runSignatureReminders(
  opts: { days?: number; documentId?: string } = {},
): Promise<{ total: number; notified: number; emailed: number; emails: string[] }> {
  const days = opts.days ?? 3;
  const admin = createAdminClient();

  let query = admin
    .from("document_requests")
    .select(
      `id, document_id, signer_id, requested_at,
       signer:profiles!document_requests_signer_id_fkey(id, full_name, email),
       document:documents!document_requests_document_id_fkey(id, title)`,
    )
    .eq("status", "pending");

  if (opts.documentId) query = query.eq("document_id", opts.documentId);
  if (days > 0) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    query = query.lt("requested_at", cutoff);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const total = data?.length ?? 0;
  if (total === 0) return { total, notified: 0, emailed: 0, emails: [] };

  // Group by signer so each person gets one nudge listing all their docs.
  const bySigner = new Map<
    string,
    { email: string | null; name: string | null; docs: { id: string; title: string }[] }
  >();
  for (const r of data ?? []) {
    const signer = r.signer as unknown as { id: string; full_name: string | null; email: string | null } | null;
    if (!signer?.id) continue;
    const doc = r.document as unknown as { id: string; title: string } | null;
    if (!doc) continue;
    const entry = bySigner.get(signer.id) ?? {
      email: signer.email ?? null,
      name: signer.full_name ?? null,
      docs: [],
    };
    entry.docs.push(doc);
    bySigner.set(signer.id, entry);
  }

  let notified = 0;
  let emailed = 0;
  const emails: string[] = [];

  for (const [signerId, entry] of bySigner) {
    const titles = entry.docs.map((d) => `“${d.title}”`).join(", ");
    await notify(
      signerId,
      "system",
      "Signature reminder",
      `You still need to sign: ${titles}`,
      entry.docs[0]?.id,
    );
    notified++;

    if (entry.email && (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)) {
      const sent = await sendEmail({
        to: entry.email,
        subject: `Celeste HQ — ${entry.docs.length} document${entry.docs.length === 1 ? "" : "s"} awaiting your signature`,
        html: emailHtml(entry.name, entry.docs),
      });
      if (sent) {
        emailed++;
        emails.push(entry.email);
      }
    }
  }

  return { total, notified, emailed, emails };
}

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL!,
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false; // never let email failures break the reminder run
  }
}

function emailHtml(name: string | null, docs: { id: string; title: string }[]) {
  const items = docs
    .map(
      (d) =>
        `<li style="margin:0 0 6px 0;font-size:14px;color:#111827;">${escapeHtml(d.title)}</li>`,
    )
    .join("");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#fafafa;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
      <p style="margin:0 0 8px 0;font-size:18px;font-weight:600;color:#111827;">Hi ${escapeHtml(name ?? "there")},</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">
        You still have documents waiting for your signature on Celeste HQ:
      </p>
      <ul style="margin:0 0 20px 0;padding-left:20px;">${items}</ul>
      <a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL ?? "/documents")}/documents"
         style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border-radius:10px;">
        Review and sign
      </a>
      <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;">Celeste HQ — internal team workspace</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
