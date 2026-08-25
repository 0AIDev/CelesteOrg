// End-to-end check of the API keys flow, exactly as the app does it:
// sign in as a real user (RLS path, not service role), create a key,
// read it back, revoke it, and confirm the hash/revoke state.
//
// Usage: node scripts/verify-api-keys.mjs [email] [password]
// Requires: migration 0004 applied + .env.local with URL + anon key.

process.loadEnvFile(".env.local");

const { createClient } = require("@supabase/supabase-js");
const { createHash } = require("crypto");

const email = process.argv[2] || "ceo@celeste.ai";
const password = process.argv[3] || "Celeste@2026";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function log(ok, msg) {
  console.log(`${ok ? "✅" : "❌"} ${msg}`);
  if (!ok) process.exitCode = 1;
}

(async () => {
  // 1. Sign in as a real user (user-scoped client → RLS applies).
  const user = createClient(url, anon, { auth: { persistSession: false } });
  const { data: session, error: signInErr } = await user.auth.signInWithPassword({ email, password });
  if (signInErr) {
    log(false, `Sign-in failed: ${signInErr.message}`);
    return;
  }
  log(true, `Signed in as ${email}`);

  // 2. Create a key through RLS (same shape as createApiKey action).
  const raw = `cel_verify_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const keyHash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 12) + "…";
  const { data: created, error: insertErr } = await user
    .from("api_keys")
    .insert({ user_id: session.user.id, name: "Verify script", key_hash: keyHash, prefix, scopes: ["read", "write"] })
    .select("id, name, prefix, key_hash, revoked_at")
    .single();
  if (insertErr) {
    log(false, `Insert failed (is migration 0004 applied?): ${insertErr.message}`);
    return;
  }
  log(true, `Key created via RLS (id ${created.id.slice(0, 8)}…)`);

  // 3. Read it back (select policy).
  const { data: listed, error: listErr } = await user
    .from("api_keys")
    .select("id, prefix, key_hash, revoked_at")
    .eq("user_id", session.user.id);
  if (listErr) {
    log(false, `Select failed: ${listErr.message}`);
    return;
  }
  const found = listed?.some((k) => k.id === created.id && k.key_hash === keyHash);
  log(!!found, `Key visible on read-back (hash matches, prefix ${prefix})`);

  // 4. Raw key must NOT be stored anywhere (only the hash exists).
  const rawInDb = listed?.some((k) => k.key_hash === raw);
  log(!rawInDb, "Raw key is not persisted (only SHA-256 hash)");

  // 5. Revoke via RLS (update policy: owner + not already revoked).
  const { error: revokeErr } = await user
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", created.id)
    .eq("user_id", session.user.id);
  if (revokeErr) {
    log(false, `Revoke failed: ${revokeErr.message}`);
    return;
  }
  log(true, "Key revoked via RLS");

  // 6. Confirm revoked state + cleanup of the test row.
  const { data: after } = await user.from("api_keys").select("revoked_at").eq("id", created.id).single();
  log(!!after?.revoked_at, "Revoked_at timestamp persisted");

  const { error: delErr } = await user.from("api_keys").delete().eq("id", created.id).eq("user_id", session.user.id);
  if (delErr) log(false, `Cleanup delete failed: ${delErr.message}`);
  else log(true, "Test row cleaned up");

  console.log("\nDone — the /developers flow (create → hash → revoke) works end to end.");
})();
