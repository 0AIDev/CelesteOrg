// Celeste HQ — seed demo data (idempotent; safe to re-run).
//
// Creates 9 teammates wired to the CEO via reports_to, plus equity grants,
// ideas, upcoming calendar events, today's daily reports and API metrics.
//
// Usage: node scripts/seed-demo.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (set it yourself).
// Run supabase/migrations/0001..0003 first, and create the CEO user
// (scripts/create-test-user.mjs) before this so the org chart has a root.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is required in .env.local");
  process.exit(1);
}

const PASSWORD = "Celeste@2026";
const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// [name, email, roleTitle, deptSlug, level, reportsToRoleTitle]
const ROSTER = [
  ["Maya Chen", "maya@celeste.ai", "Head of Product", "product", 2, "CEO"],
  ["Luca Romano", "luca@celeste.ai", "Head of Engineering", "engineering", 2, "CEO"],
  ["Sofia Rossi", "sofia@celeste.ai", "Design Lead", "design", 2, "CEO"],
  ["James Okafor", "james@celeste.ai", "Head of Growth", "growth", 2, "CEO"],
  ["Priya Sharma", "priya@celeste.ai", "Head of Operations", "operations", 2, "CEO"],
  ["Daniel Kim", "daniel@celeste.ai", "Senior Engineer", "engineering", 3, "Head of Engineering"],
  ["Emma Wilson", "emma@celeste.ai", "Engineer", "engineering", 3, "Head of Engineering"],
  ["Tomás Alvarez", "tomas@celeste.ai", "Product Designer", "design", 3, "Design Lead"],
  ["Aisha Bello", "aisha@celeste.ai", "Marketing Manager", "growth", 3, "Head of Growth"],
];

const LOCATIONS = ["Remote · Europe", "Milan", "London", "Berlin", "Remote · US East", "Lisbon"];
const BIOS = [
  "Product-minded builder focused on user value.",
  "Loves clean systems, reliable infra, and shipping.",
  "Pixel-obsessed designer with an eye for motion.",
  "Growth experiments and data-driven storytelling.",
  "People, finance and processes that just work.",
  "TypeScript enthusiast. Coffee-powered.",
  "Frontend engineer, accessibility advocate.",
  "Design systems and delightful details.",
  "Campaigns, community and compounding loops.",
];

async function main() {
  // Preflight
  const { error: preflight } = await admin.from("departments").select("id").limit(1);
  if (preflight) {
    console.error("❌ Schema not set up. Run the migrations first.");
    process.exit(1);
  }

  const { data: depts } = await admin.from("departments").select("id, slug");
  const deptId = (slug) => depts?.find((d) => d.slug === slug)?.id ?? null;

  // CEO (root of the tree)
  const { data: ceoUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let ceo = ceoUsers?.users?.find((u) => u.email === "ceo@celeste.ai");
  if (!ceo) {
    const { data, error } = await admin.auth.admin.createUser({
      email: "ceo@celeste.ai",
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: "Celeste Founder" },
    });
    if (error) throw error;
    ceo = data.user;
    console.log("✅ CEO created (ceo@celeste.ai)");
  }

  const { data: ceoProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", ceo.id)
    .maybeSingle();
  if (!ceoProfile) {
    await admin.from("profiles").upsert({
      id: ceo.id,
      email: ceo.email,
      full_name: "Celeste Founder",
      is_founder: true,
      department_id: deptId("leadership"),
      role_title: "CEO",
    }, { onConflict: "id" });
  }

  const { data: ceoRole } = await admin
    .from("roles")
    .select("id")
    .eq("profile_id", ceo.id)
    .maybeSingle();
  const ceoRoleId = ceoRole?.id;

  // People
  const roleIdByTitle = new Map();
  if (ceoRoleId) roleIdByTitle.set("CEO", ceoRoleId);

  // People (await sequentially so reports_to ids are available)
  for (const row of ROSTER) {
    const [fullName, email, roleTitle, slug, level, reportsToTitle] = row;
    const i = ROSTER.indexOf(row);
    let user = ceoUsers?.users?.find((u) => u.email === email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      user = data.user;
      console.log(`  + user ${email}`);
    }
    await admin.from("profiles").upsert({
      id: user.id,
      email,
      full_name: fullName,
      is_founder: false,
      department_id: deptId(slug),
      role_title: roleTitle,
      location: LOCATIONS[i % LOCATIONS.length],
      bio: BIOS[i % BIOS.length],
      previous_companies: ["Acme", "Globex"].slice(0, (level % 2) + 1),
      joined_at: "2025-11-15",
    }, { onConflict: "id" });
    const { data: existingRole } = await admin
      .from("roles")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();
    const reportsToId = roleIdByTitle.get(reportsToTitle) ?? ceoRoleId ?? null;
    if (existingRole) {
      await admin.from("roles").update({
        title: roleTitle,
        department_id: deptId(slug),
        reports_to: reportsToId,
        level,
      }).eq("id", existingRole.id);
      roleIdByTitle.set(roleTitle, existingRole.id);
    } else {
      const { data: role } = await admin.from("roles").insert({
        profile_id: user.id,
        title: roleTitle,
        department_id: deptId(slug),
        reports_to: reportsToId,
        level,
      }).select("id").single();
      roleIdByTitle.set(roleTitle, role.id);
    }
  }
  console.log(`✅ ${ROSTER.length} teammates + roles wired to the CEO`);

  // Re-fetch users so lookups work even on the very first run.
  const { data: allUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const byEmail = (e) => allUsers?.users?.find((u) => u.email === e);
  const maya = byEmail("maya@celeste.ai");
  const luca = byEmail("luca@celeste.ai");
  const sofia = byEmail("sofia@celeste.ai");
  for (const [u, total, vested] of [
    [maya, 10000, 1000],
    [luca, 8000, 800],
  ]) {
    if (!u) continue;
    const { data: existing } = await admin
      .from("equity_grants")
      .select("id")
      .eq("user_id", u.id)
      .maybeSingle();
    if (existing) continue;
    await admin.from("equity_grants").insert({
      user_id: u.id,
      total_shares: total,
      vested_shares: vested,
      vesting_start: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      cliff_months: 12,
      schedule_type: "monthly",
    });
  }
  console.log("✅ 2 equity grants");

  // Ideas
  const { data: ideaCount } = await admin.from("ideas").select("id").limit(1);
  if ((ideaCount?.length ?? 0) === 0 && maya) {
    const ideas = [
      ["AI-powered standup summaries", "Summarize the week's reports into a digest for all-hands.", "AI", "high"],
      ["Internal docs search with embeddings", "Semantic search over the documents bucket.", "Engineering", "medium"],
      ["Remote-first wellness budget", "Monthly stipend for home-office and gym.", "People", "medium"],
      ["Customer support triage bot", "Route support tickets by intent before they hit humans.", "Product", "high"],
      ["Recurring 1:1 reminders", "Auto-suggest 1:1 slots based on calendar gaps.", "Operations", "low"],
    ];
    for (const [title, content, category, priority] of ideas) {
      await admin.from("ideas").insert({
        author_id: maya.id,
        title,
        content,
        category,
        priority,
        status: "new",
        ai_summary: `Suggestion: ${title}. ${content}`.slice(0, 200),
      });
    }
    console.log("✅ 5 ideas");
  }

  // Upcoming calendar events
  const { data: eventCount } = await admin.from("calendar_events").select("id").limit(1);
  if ((eventCount?.length ?? 0) === 0) {
    const day = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);
    const evts = [
      ["Offsite planning", "meeting", 3, 9, 10, "approved", maya],
      ["Remote day", "remote", 1, 8, 18, "pending", luca],
      ["Vacation", "vacation", 7, 8, 18, "pending", sofia],
      ["Sprint review", "meeting", 2, 15, 16, "approved", luca],
    ];
    for (const [title, type, inDays, h1, h2, status, owner] of evts) {
      if (!owner) continue;
      const d = day(inDays);
      const start = new Date(d); start.setHours(h1, 0, 0, 0);
      const end = new Date(d); end.setHours(h2, 0, 0, 0);
      await admin.from("calendar_events").insert({
        title, type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        user_id: owner.id,
        status,
      });
    }
    console.log("✅ 4 calendar events");
  }

  // Today's daily reports
  const today = new Date().toISOString().slice(0, 10);
  const reporters = ["maya@celeste.ai", "luca@celeste.ai", "sofia@celeste.ai"];
  for (const email of reporters) {
    const u = byEmail(email);
    if (!u) continue;
    await admin.from("daily_reports").upsert({
      user_id: u.id,
      date: today,
      morning_plan: "Ship the Q3 roadmap draft and review design handoff.",
      eod_summary: "Roadmap drafted, two approvals cleared, unblocked the design system migration.",
      blockers: null,
      status: "submitted",
    }, { onConflict: "user_id,date" });
  }
  console.log(`✅ daily reports for ${reporters.length} people`);

  // API metrics (only if empty) — attributed across team members so the
  // realtime AI usage page has per-user data out of the box.
  const { data: metricCount } = await admin.from("api_metrics").select("id").limit(1);
  if ((metricCount?.length ?? 0) === 0) {
    const providers = ["openai", "anthropic", "openai", "openai", "anthropic", "google"];
    const consumers = ["maya@celeste.ai", "luca@celeste.ai", "sofia@celeste.ai", "ceo@celeste.ai", null];
    const rows = [];
    for (let i = 0; i < 48; i++) {
      const p = providers[i % providers.length];
      const tokens = Math.floor(200 + Math.random() * 4000);
      const email = consumers[i % consumers.length];
      const u = email ? byEmail(email) : null;
      rows.push({
        provider: p,
        model: p === "openai" ? "gpt-4o-mini" : p === "anthropic" ? "claude-3-5-sonnet" : p === "google" ? "gemini-1.5-flash" : "celeste-embed",
        tokens_used: tokens,
        cost: Math.round(tokens * 0.000004 * 100000) / 100000,
        latency_ms: Math.floor(250 + Math.random() * 900),
        status: Math.random() > 0.92 ? "error" : "ok",
        recorded_at: new Date(Date.now() - (47 - i) * 30 * 60 * 1000).toISOString(),
        user_id: u?.id ?? null,
      });
    }
    await admin.from("api_metrics").insert(rows);
    console.log("✅ 48 API metric rows (attributed to team members)");
  }

  console.log("\n🎉 Demo data seeded! Log in and check the org chart, dashboard, calendar and ideas.");
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
