"use client";

import { useState } from "react";
import { Spinner } from "@phosphor-icons/react";

export default function SetupPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[] | null>(null);
  const [error, setError] = useState("");

  async function runSetup() {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/setup-tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        setResults(data.results);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Database Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your Supabase database password to create missing tables (tasks, prompt_vault, issues, crm_activities).
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Find your password at: Supabase Dashboard → Project Settings → Database → Connection string → Password
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Database password"
            className="input flex-1 h-9 text-[13px]"
            onKeyDown={(e) => e.key === "Enter" && runSetup()}
          />
          <button
            onClick={runSetup}
            disabled={loading || !password.trim()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? <Spinner className="h-4 w-4 animate-spin" /> : "Run Setup"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-[13px] text-red-600">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-4 space-y-1">
            {results.map((r, i) => (
              <div key={i} className="text-[12px] text-gray-600 font-mono">
                {r}
              </div>
            ))}
            <p className="mt-3 text-[13px] font-medium text-green-600">
              ✅ Setup complete! All tables are now created.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
