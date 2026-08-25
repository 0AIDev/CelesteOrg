// Celeste HQ — remove placeholder positions from the org chart.
//
// Deletes every role EXCEPT the CEO's (the founder's role), so the chart
// starts with just the CEO. New people enter the chart via invites, which
// create a role wired under the CEO with the chosen position.
//
// Usage: node scripts/cleanup-placeholder-roles.mjs
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

async function main() {
  // All roles with their profile (to spot the founder/CEO).
  const { data: roles, error } = await admin
    .from("roles")
    .select("id, title, profile_id, reports_to, profile:profiles(id, email, is_founder)");

  if (error) {
    console.error("❌ Could not load roles:", error.message);
    process.exit(1);
  }
  if (!roles?.length) {
    console.log("ℹ️ No roles found — nothing to clean up.");
    return;
  }

  // Keep the CEO: the root role (no reports_to) whose profile is a founder.
  const keep = roles.filter(
    (r) => r.reports_to === null && r.profile?.is_founder === true,
  );
  const keepIds = new Set(keep.map((r) => r.id));

  const drop = roles.filter((r) => !keepIds.has(r.id));
  if (drop.length === 0) {
    console.log("ℹ️ Only the CEO role exists — nothing to remove.");
    return;
  }

  console.log(`Keeping ${keep.length} role(s): ${keep.map((r) => r.title ?? r.id).join(", ") || "(CEO)"}`);
  console.log(`Removing ${drop.length} placeholder role(s):`);
  for (const r of drop) {
    console.log(`  - ${r.title ?? "(untitled)"} (${r.profile?.email ?? r.profile_id})`);
  }

  const { error: delErr } = await admin
    .from("roles")
    .delete()
    .in(
      "id",
      drop.map((r) => r.id),
    );
  if (delErr) {
    console.error("❌ Delete failed:", delErr.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${drop.length} roles. Org chart now shows only the CEO.`);
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
