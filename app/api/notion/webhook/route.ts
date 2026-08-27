import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorized(request: Request, rawBody: string) {
  const secret = process.env.NOTION_WEBHOOK_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-notion-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!authorized(request, rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = String(payload.type ?? payload.event_type ?? "");
    if (!["page_created", "page_updated"].includes(eventType)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const page = (payload.page ?? payload.data ?? payload) as Record<string, unknown>;
    const properties = (page.properties ?? {}) as Record<string, unknown>;
    const title = String(
      page.title ??
      (Object.values(properties).find((value) => (value as Record<string, unknown>)?.type === "title") as Record<string, unknown> | undefined)?.title ??
      "Untitled",
    );
    const pageId = String(page.id ?? payload.page_id ?? "");
    if (!pageId) return NextResponse.json({ error: "Missing page id" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("notion_pages_cache").upsert({
      notion_page_id: pageId,
      title,
      url: typeof page.url === "string" ? page.url : null,
      parent_type: typeof page.parent_type === "string" ? page.parent_type : null,
      last_edited_time: typeof page.last_edited_time === "string" ? page.last_edited_time : new Date().toISOString(),
      content_snippet: typeof page.content_snippet === "string" ? page.content_snippet : null,
    }, { onConflict: "notion_page_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
