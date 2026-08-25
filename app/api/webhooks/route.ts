import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

/**
 * Webhook endpoint — receives external events and posts them to the Celeste
 * activity feed (notifications table, same stream the header bell reads).
 *
 * Configure in Supabase (Database → Webhooks → New webhook):
 *   - Method: POST
 *   - URL:    https://<your-app>/api/webhooks
 *   - Header: x-webhook-secret: <WEBHOOK_SECRET from .env.local>
 *   - Payload (notification): { "type": "idea"|"approval"|"invite"|"report"|"system",
 *                "recipient_email": "ceo@celeste.ai",   // optional; falls back to broadcast
 *                "title": "...", "body": "..." }
 *   - Payload (AI usage):      { "metric": { "provider": "openai", "model": "gpt-4o-mini",
 *                "tokens_used": 1234, "cost": 0.002, "latency_ms": 340,
 *                "status": "ok", "user_email": "mattia@celeste.ai" } }
 *
 * The secret is compared with timingSafeEqual; unknown senders get 401.
 */

const webhookSchema = z.object({
  type: z.enum(["approval", "idea", "invite", "report", "system"]).default("system"),
  recipient_email: z.string().email().optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(2000).optional(),
  target_id: z.string().optional(),
  metric: z
    .object({
      provider: z.string().min(1).max(40),
      model: z.string().max(80).optional(),
      tokens_used: z.number().int().min(0).default(0),
      cost: z.number().min(0).default(0),
      latency_ms: z.number().int().min(0).default(0),
      status: z.enum(["ok", "error", "timeout"]).default("ok"),
      user_email: z.string().email().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhooks not configured (WEBHOOK_SECRET missing)" }, { status: 503 });
  }

  const provided = request.headers.get("x-webhook-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  const valid =
    a.length === b.length &&
    (a.length === 0 || timingSafeEqual(a, b));
  if (!valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, recipient_email, title, body, target_id, metric } = parsed.data;
  const admin = createAdminClient();

  try {
    // ── AI usage metric payload ────────────────────────────────────────────
    if (metric) {
      let user_id: string | null = null;
      if (metric.user_email) {
        const { data } = await admin
          .from("profiles")
          .select("id")
          .eq("email", metric.user_email)
          .maybeSingle();
        user_id = data?.id ?? null;
      }
      const { error } = await admin.from("api_metrics").insert({
        provider: metric.provider.toLowerCase(),
        model: metric.model ?? null,
        tokens_used: metric.tokens_used,
        cost: metric.cost,
        latency_ms: metric.latency_ms,
        status: metric.status,
        user_id,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, recorded: true, user_id });
    }

    if (!title) {
      return NextResponse.json({ error: "Either a title or a metric payload is required" }, { status: 400 });
    }

    // Resolve recipient by email; if absent, broadcast to founders (like ideas).
    let recipients: { id: string }[];
    if (recipient_email) {
      const { data, error } = await admin.from("profiles").select("id").eq("email", recipient_email);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      recipients = data ?? [];
    } else {
      const { data } = await admin.from("profiles").select("id").eq("is_founder", true);
      recipients = data ?? [];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, delivered: 0, note: "No recipients matched" });
    }

    const rows = recipients.map((r) => ({
      recipient_id: r.id,
      type,
      title,
      body: body ?? null,
      target_id: target_id ?? null,
    }));
    const { error } = await admin.from("notifications").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, delivered: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
