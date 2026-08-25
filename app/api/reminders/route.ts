import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runSignatureReminders } from "@/lib/reminders";

/**
 * POST /api/reminders — runs the signature-reminder sweep for requests that
 * have been pending longer than `days` (default 3). Authenticated with the
 * same WEBHOOK_SECRET used by /api/webhooks, so the pg_cron job (or any
 * scheduler) can call it safely.
 *
 * Body (optional): { "days": 3 }          — age threshold in days
 *                  { "days": 3, "dryRun": true } — report without sending
 */

const schema = z.object({
  days: z.number().int().min(0).max(90).optional(),
  dryRun: z.boolean().optional(),
});

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Reminders not configured (WEBHOOK_SECRET missing)" }, { status: 503 });
  }

  const provided = request.headers.get("x-webhook-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const valid = a.length === b.length && (a.length === 0 || timingSafeEqual(a, b));
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is fine — defaults apply
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runSignatureReminders({ days: parsed.data.days ?? 3 });
    return NextResponse.json({
      ok: true,
      total: result.total,
      reminded: result.notified,
      emailed: result.emailed,
      emails: result.emails,
      dryRun: parsed.data.dryRun ?? false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reminder run failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
