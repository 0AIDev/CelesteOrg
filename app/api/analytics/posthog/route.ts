import { NextRequest, NextResponse } from "next/server";

// ─── PostHog config ──────────────────────────────────────────────────────────
// POSTHOG_HOST defaults to US Cloud. Use https://eu.posthog.com for EU.
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY ?? "";
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function phFetch(path: string, body?: Record<string, unknown>) {
  const url = `${POSTHOG_HOST}${path}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${POSTHOG_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 300 }, // cache 5 min
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PostHog ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Query builders ──────────────────────────────────────────────────────────

/** Total unique users in the last N days */
async function activeUsers(days: number) {
  const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const data = await phFetch(
    `/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`,
    {
      query: {
        kind: "TrendsQuery",
        dateRange: { date_from: dateFrom },
        series: [
          {
            kind: "EventsNode",
            event: "$pageview",
            math: "unique_users",
            name: "$pageview",
          },
        ],
        interval: "day",
      },
    },
  );
  return data;
}

/** Event count over time */
async function eventCounts(days: number) {
  const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const data = await phFetch(
    `/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`,
    {
      query: {
        kind: "TrendsQuery",
        dateRange: { date_from: dateFrom },
        series: [
          {
            kind: "EventsNode",
            event: "$pageview",
            math: "total_count",
            name: "$pageview",
          },
        ],
        interval: "day",
      },
    },
  );
  return data;
}

/** Top events by volume */
async function topEvents(limit = 10) {
  const dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const data = await phFetch(
    `/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`,
    {
      query: {
        kind: "TrendsQuery",
        dateRange: { date_from: dateFrom },
        series: [
          {
            kind: "EventsNode",
            event: "$pageview",
            math: "total_count",
            name: "$pageview",
          },
        ],
        breakdown: { breakdown: "$current_url", breakdown_type: "event" },
        interval: "week",
      },
    },
  );
  return data;
}

/** Session count */
async function sessionCount(days: number) {
  const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const data = await phFetch(
    `/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/`,
    {
      query: {
        kind: "TrendsQuery",
        dateRange: { date_from: dateFrom },
        series: [
          {
            kind: "EventsNode",
            event: "$pageview",
            math: "unique_sessions",
            name: "$pageview",
          },
        ],
        interval: "day",
      },
    },
  );
  return data;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    return NextResponse.json(
      {
        error: "PostHog not configured",
        message: "Set POSTHOG_API_KEY and POSTHOG_PROJECT_ID in environment variables",
      },
      { status: 503 },
    );
  }

  const view = req.nextUrl.searchParams.get("view") ?? "overview";

  try {
    let data: Record<string, unknown>;

    switch (view) {
      case "active-users":
        data = await activeUsers(30);
        break;
      case "event-counts":
        data = await eventCounts(30);
        break;
      case "top-events":
        data = await topEvents();
        break;
      case "sessions":
        data = await sessionCount(30);
        break;
      case "overview":
      default: {
        // Parallel fetch: active users (7d + 30d for trend), sessions, events
        const [users7, users30, sessions30, events7] = await Promise.all([
          activeUsers(7),
          activeUsers(30),
          sessionCount(30),
          eventCounts(7),
        ]);
        data = { users7, users30, sessions30, events7 };
        break;
      }
    }

    return NextResponse.json({ ok: true, view, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[posthog-api]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
