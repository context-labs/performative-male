"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ExpandableImage } from "@/components/ExpandableImage";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Entry = {
  id: number;
  imageId: number;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
};

type ApiResponse = {
  success: true;
  entries: Array<{
    id: number;
    imageId: number;
    score: number;
    matchedKeywords: string[] | string | null;
    createdAt: string;
  }>;
};

function scorePillClass(score: number) {
  if (score >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (score >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
}

export function LeaderboardClient({ initial }: { initial: Entry[] }) {
  const [q, setQ] = useState("");
  const [minScore, setMinScore] = useState(3);
  const [sort, setSort] = useState<"score_desc" | "score_asc" | "time_desc" | "time_asc">("score_desc");
  const [maleOnly, setMaleOnly] = useState(true);
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [loading, setLoading] = useState(false);

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    u.set("minScore", String(minScore));
    u.set("sort", sort);
    u.set("maleOnly", String(maleOnly));
    u.set("limit", "100");
    return u.toString();
  }, [q, minScore, sort, maleOnly]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`/api/leaderboard?${params}`, { cache: "no-store" });
        if (!resp.ok) return;
        const json = (await resp.json()) as ApiResponse;
        if (ignore || !json.success) return;
        const list: Entry[] = json.entries.map((r) => ({
          id: r.id,
          imageId: r.imageId,
          score: r.score,
          matchedKeywords: Array.isArray(r.matchedKeywords)
            ? r.matchedKeywords
            : (r.matchedKeywords ?? "").split(",").filter(Boolean),
          createdAt: r.createdAt,
        }));
        setEntries(list);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [params]);

  return (
    <section className="space-y-4">
      {/* Back to home */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
      {/* Controls */}
      <div className="rounded-lg border p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="keywords or text…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Min score</label>
            <input
              type="number"
              min={0}
              max={10}
              value={minScore}
              onChange={(e) => setMinScore(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground mb-1">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "score_desc" | "score_asc" | "time_desc" | "time_asc")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="score_desc">Score: High → Low</option>
                <option value="score_asc">Score: Low → High</option>
                <option value="time_desc">Newest first</option>
                <option value="time_asc">Oldest first</option>
              </select>
            </div>
            <label className="inline-flex select-none items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={maleOnly}
                onChange={(e) => setMaleOnly(e.target.checked)}
                className="rounded border"
              />
              Male-only
            </label>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {entries.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {loading ? "Loading…" : "No entries match your filters."}
        </div>
      ) : (
        <div className={cn("grid gap-3", "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
          {entries.map((e, i) => (
            <article key={e.id} className="rounded-lg border">
              <div className="relative h-52 sm:h-60 overflow-hidden rounded-t-lg bg-muted">
                <ExpandableImage src={`/img/${e.imageId}?w=640&fmt=webp&q=72`} alt={`Entry ${e.id}`} className="h-full w-full object-contain" />
                <div className="absolute left-2 top-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">#{i + 1}</div>
                <div className={cn("absolute right-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", scorePillClass(e.score))}>{e.score}/10</div>
              </div>
              <div className="p-3">
                <div className="flex flex-wrap gap-1.5">
                  {e.matchedKeywords.slice(0, 6).map((k) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      {k}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

