// Celeste HQ — provision the "supreme boss" test user.
//
// Usage:
//   node scripts/create-test-user.mjs                          # defaults
//   node scripts/create-test-user.mjs email password fullName  # custom
//
// Requires (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY        <- set this yourself, never share it
//
// Prerequisite: run supabase/migrations/0001_init.sql in the SQL editor first.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local",
  );
  console.error(
    "   (service_role: Supabase Dashboard → Settings → API — add it yourself, never paste it in chat)",
  );
  process.exit(1);
}

const email = process.argv[2] || "ceo@celeste.ai";
const password = process.argv[3] || "Celeste@2026";
const fullName = process.argv[4] || "Celeste Founder";

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Preflight: the schema must exist (migration applied).
  const { error: preflight } = await admin.from("departments").select("id").limit(1);
  if (preflight) {
    console.error("❌ The database schema isn't set up yet.");
    console.error("   Run supabase/migrations/0001_init.sql in the Supabase SQL Editor, then re-run this script.");
    process.exit(1);
  }

  // 1) Create or update the auth user (admin claim, email pre-confirmed so no
  //    confirmation email / SMTP is needed to log in).
  let userId;
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    userId = found.id;
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      app_metadata: { ...found.app_metadata, role: "admin" },
      user_metadata: { ...found.user_metadata, full_name: fullName },
    });
    if (error) throw error;
    console.log("ℹ️  User already existed — updated password/role instead.");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("✅ Auth user created.");
  }

  // 2) Profile: founder + Leadership department (bypasses RLS via admin client).
  const { data: dept } = await admin
    .from("departments")
    .select("id")
    .eq("slug", "leadership")
    .maybeSingle();
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      is_founder: true,
      department_id: dept?.id ?? null,
      role_title: "Chief Executive Officer",
      joined_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "id" },
  );
  if (profErr) throw profErr;
  console.log("✅ Profile set: founder + Leadership department.");

  // 3) Role at the very top of the org chart.
  const { data: existingRole } = await admin
    .from("roles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!existingRole) {
    const { error: roleErr } = await admin.from("roles").insert({
      profile_id: userId,
      title: "Chief Executive Officer",
      department_id: dept?.id ?? null,
      level: 1,
    });
    if (roleErr) throw roleErr;
    console.log("✅ Role 'CEO' (level 1) added to the org chart.");
  }

  console.log("\n─────────────────────────────");
  console.log("🎉 Test user ready!");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("   Role:     admin · founder · CEO");
  console.log("─────────────────────────────");
  console.log("Login at http://localhost:3000/sign-in");
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
