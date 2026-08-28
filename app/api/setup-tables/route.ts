import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ ok: false, error: "Password required" });
    }

    // Dynamic import of pg to avoid bundling
    const { Client } = await import("pg");
    const client = new Client({
      host: "db.qbfrfmftrmbieoqlntxo.supabase.co",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    const sqlPath = join(process.cwd(), "scripts", "ensure-tables.sql");
    const sql = readFileSync(sqlPath, "utf-8");

    // Split by semicolons and execute each statement
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    const results: string[] = [];
    for (const stmt of statements) {
      try {
        await client.query(stmt + ";");
        const short = stmt.substring(0, 80).replace(/\n/g, " ");
        results.push(`✅ ${short}...`);
      } catch (e: any) {
        if (e.code === "42710" || e.code === "42P07" || e.code === "42701") {
          // Already exists — skip
          results.push(`⏭️ Already exists: ${e.message.substring(0, 60)}`);
        } else {
          results.push(`❌ ${e.message.substring(0, 100)}`);
        }
      }
    }

    await client.end();

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message });
  }
}
