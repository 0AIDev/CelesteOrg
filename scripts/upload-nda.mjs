// Upload the NDA template to Supabase storage and update the document record.
//
// Usage:  node scripts/upload-nda.mjs
//
// Requires (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { readFileSync, statSync } from "fs";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const filePath = "internal/nda-template.md";
  const fileContent = readFileSync("internal/nda-template.md");
  const fileSize = statSync("internal/nda-template.md").size;

  console.log(`📄 NDA document: ${fileSize} bytes`);

  // 1) Upload the file to Supabase storage
  const { error: uploadErr } = await admin.storage
    .from("documents")
    .upload(filePath, fileContent, {
      contentType: "text/markdown",
      upsert: true,
    });

  if (uploadErr) {
    console.error("❌ Upload failed:", uploadErr.message);
    process.exit(1);
  }
  console.log("✅ File uploaded to storage:", filePath);

  // 2) Find the existing document record
  const { data: doc, error: findErr } = await admin
    .from("documents")
    .select("id")
    .eq("file_path", filePath)
    .maybeSingle();

  if (findErr || !doc) {
    console.error("❌ Document record not found. The NDA may not have been created yet.");
    console.error("   Run the onboarding flow first, or create the document manually.");
    process.exit(1);
  }

  // 3) Update the document record with correct file size and mime type
  const { error: updateErr } = await admin
    .from("documents")
    .update({
      file_size: fileSize,
      mime_type: "text/markdown",
    })
    .eq("id", doc.id);

  if (updateErr) {
    console.error("❌ Failed to update document record:", updateErr.message);
    process.exit(1);
  }

  console.log("✅ Document record updated (file_size, mime_type)");
  console.log(`   Document ID: ${doc.id}`);
  console.log("   View at: /documents");
}

main().catch((e) => {
  console.error("❌ Failed:", e.message);
  process.exit(1);
});
