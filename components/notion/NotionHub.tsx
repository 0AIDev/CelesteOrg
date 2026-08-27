"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, ArrowsClockwise, FileText, MagnifyingGlass, SquaresFour, Rows } from "@phosphor-icons/react";

export type NotionPage = {
  id: string;
  notion_page_id: string;
  title: string;
  url: string | null;
  parent_type: string | null;
  last_edited_time: string | null;
  content_snippet: string | null;
  vector_indexed: boolean;
};

export function NotionHub() {
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadPages = useCallback(async (search = query) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/notion/pages${search ? `?q=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
      const payload = await response.json() as { pages?: NotionPage[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load Notion pages");
      setPages(payload.pages ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Notion pages");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void loadPages(""); }, [loadPages]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPages(); }, 250);
    return () => window.clearTimeout(timer);
  }, [query, loadPages]);

  const emptyLabel = useMemo(() => query ? "No pages match your search." : "No Notion pages have been synchronized yet.", [query]);

  async function sync() {
    setSyncing(true);
    await loadPages();
    setSyncing(false);
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">Workspace knowledge</p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950 dark:text-white">Notion</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your synchronized company documents, in one quiet place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setView("grid")} aria-label="Grid view" className={`rounded-lg p-2 ${view === "grid" ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white" : "text-gray-400"}`}><SquaresFour size={17} /></button>
          <button type="button" onClick={() => setView("list")} aria-label="List view" className={`rounded-lg p-2 ${view === "list" ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white" : "text-gray-400"}`}><Rows size={17} /></button>
          <button type="button" onClick={sync} disabled={syncing} className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"><ArrowsClockwise size={16} className={syncing ? "animate-spin" : ""} />Sync</button>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
        <MagnifyingGlass size={17} className="text-gray-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Notion pages..." className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-white" />
      </div>

      {error && <p className="mb-4 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 dark:border-white/10 dark:text-gray-300">{error}</p>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Skeleton /><Skeleton /><Skeleton /></div> : pages.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-white/10">{emptyLabel}</div> : <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>{pages.map((page) => <PageCard key={page.id} page={page} list={view === "list"} />)}</div>}
    </section>
  );
}

function PageCard({ page, list }: { page: NotionPage; list: boolean }) {
  return <article className={`group rounded-2xl border border-gray-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.04] ${list ? "flex items-center gap-4" : "min-h-40"}`}>
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"><FileText size={18} /></div>
    <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{page.title || "Untitled"}</h2>{page.url && <a href={page.url} target="_blank" rel="noreferrer" aria-label={`Open ${page.title} in Notion`} className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white"><ArrowSquareOut size={16} /></a>}</div><p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{page.content_snippet || "Synchronized Notion page"}</p><p className="mt-4 text-[11px] text-gray-400">{page.last_edited_time ? `Edited ${new Date(page.last_edited_time).toLocaleDateString()}` : "Recently synchronized"}</p></div>
  </article>;
}

function Skeleton() { return <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.06]" />; }
