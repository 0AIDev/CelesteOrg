// Celeste HQ — remove all mock/demo data, keeping only the CEO.
//
// Deletes the 9 placeholder users (maya@, luca@, …) and every row they own
// (ideas, calendar events, daily reports, API metrics, equity grants,
// notifications). The CEO (ceo@celeste.ai) and their data are kept.
//
// Usage: node scripts/cleanup-mock-data.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// The demo seed's placeholder emails — the only mock users we delete.
const MOCK_EMAILS = [
  "maya@celeste.ai",
  "luca@celeste.ai",
  "sofia@celeste.ai",
  "james@celeste.ai",
  "priya@celeste.ai",
  "daniel@celeste.ai",
  "emma@celeste.ai",
  "tomas@celeste.ai",
  "aisha@celeste.ai",
];

async function main() {
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    console.error("❌ Could not list users:", listErr.message);
    process.exit(1);
  }

  const mock = (users?.users ?? []).filter((u) =>
    MOCK_EMAILS.includes((u.email ?? "").toLowerCase()),
  );
  const mockIds = mock.map((u) => u.id);
  const mockEmails = new Set(mock.map((u) => (u.email ?? "").toLowerCase()));

  console.log(`Mock users to remove: ${mock.length}`);
  for (const u of mock) console.log(`  - ${u.email}`);

  // Tables that were only ever populated by the demo seed → wipe entirely.
  const wipeAll = ["ideas", "calendar_events", "daily_reports", "api_metrics", "equity_grants"];
  for (const t of wipeAll) {
    const { count } = await admin.from(t).select("id", { count: "exact", head: true });
    if (count && count > 0) {
      const { error } = await admin.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      console.log(`  wiped ${t}: ${count} rows${error ? ` (error: ${error.message})` : ""}`);
    }
  }

  // Notifications for mock users (they were recipients of seeded approves).
  if (mockIds.length) {
    const { count } = await admin.from("notifications").select("id", { count: "exact", head: true }).in("recipient_id", mockIds);
    if (count) {
      const { error } = await admin.from("notifications").delete().in("recipient_id", mockIds);
      console.log(`  removed notifications for mock users: ${count}${error ? ` (error: ${error.message})` : ""}`);
    }
    const { data: profiles, error: pErr } = await admin.from("profiles").select("id").in("id", mockIds);
    if (pErr) {
      console.error("❌ Could not load mock profiles:", pErr.message);
      process.exit(1);
    }
    if (profiles?.length) {
      const { error } = await admin.from("profiles").delete().in("id", mockIds);
      if (error) {
        console.error("❌ Could not delete mock profiles:", error.message);
        process.exit(1);
      }
      console.log(`  removed mock profiles: ${profiles.length}`);
    }
    for (const u of mock) {
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) console.error(`  ⚠️ could not delete ${u.email}: ${error.message}`);
      else console.log(`  removed auth user: ${u.email}`);
    }
  }

  const { data: remaining } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  console.log(
    `\n✅ Done. Remaining auth users: ${(remaining?.users ?? []).map((u) => u.email).join(", ") || "(none)"}`,
  );
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
