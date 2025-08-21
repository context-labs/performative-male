export const dynamic = 'force-dynamic';

import { db } from '@/src/db';
import { entriesTable } from '@/src/schema';
import { and, desc, gte, sql } from 'drizzle-orm';
import { ExpandableImage } from '@/components/ExpandableImage';
import { Podium } from '@/components/Podium';

type Entry = {
  id: number;
  imageDataUrl: string;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
  socialPlatform?: 'twitter' | 'instagram' | 'tiktok' | null;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
};

export default async function LeaderboardPage() {
  const rows = await db
    .select({
      id: entriesTable.id,
      imageDataUrl: entriesTable.imageDataUrl,
      score: entriesTable.score,
      matchedKeywords: entriesTable.matchedKeywords,
      createdAt: entriesTable.createdAt,
      socialPlatform: entriesTable.socialPlatform,
      socialUrl: entriesTable.socialUrl,
      podiumOptIn: entriesTable.podiumOptIn,
    })
    .from(entriesTable)
    .where(
      and(
        gte(entriesTable.score, 3),
        sql`${entriesTable.resultJson} ~* ${"\\y(man|male|guy|boy|gentleman|dude|men|boys|guys|person)\\y"}`
      )
    )
    .orderBy(desc(entriesTable.score), desc(entriesTable.createdAt))
    .limit(50);

  const entries: Entry[] = rows.map((r) => ({
    id: r.id!,
    imageDataUrl: r.imageDataUrl!,
    score: r.score!,
    matchedKeywords: (r.matchedKeywords ?? '').split(',').filter(Boolean),
    createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
    socialPlatform: (r as { socialPlatform?: 'twitter' | 'instagram' | 'tiktok' | null }).socialPlatform ?? null,
    socialUrl: (r as { socialUrl?: string | null }).socialUrl ?? null,
    podiumOptIn: Boolean((r as { podiumOptIn?: boolean }).podiumOptIn),
  }));

  return (
    <div className="min-h-dvh p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Top partner banner (sticky, ultra-subtle, hidden on mobile) */}
        <div className="hidden md:block sticky top-0 z-30 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40 border-b">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/grass-inference-logs.png" alt="Grass × Inference" className="h-16 w-full object-cover" />
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Top submissions ranked by performativity score.</p>
          </div>
        </div>

        {/* Podium for top 3 (only entries that opted in) */}
        <Podium entries={entries.filter((e) => e.podiumOptIn !== false).slice(0, 3)} />

        {entries.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No entries yet.</div>
        ) : (
          <div className="space-y-4">
            {/* Mobile list */}
            <div className="block sm:hidden rounded-xl border divide-y">
              {entries.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3 p-3">
                  <div className="text-xs w-8 text-muted-foreground">#{i + 1}</div>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-black/5">
                    <ExpandableImage src={e.imageDataUrl} alt={`Entry ${e.id}`} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{e.score}/10</div>
                    <div className="mt-0.5 flex max-w-[18rem] flex-wrap gap-1.5">
                      {e.matchedKeywords.slice(0, 4).map((k) => (
                        <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Rank</th>
                  <th className="px-4 py-3 font-semibold">Preview</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Keywords</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const rank = i + 1;
                  return (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-3 w-16">#{rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ExpandableImage
                            src={e.imageDataUrl}
                            alt={`Entry ${e.id}`}
                            className="h-14 w-14 rounded-md object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {e.score}/10
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-[38rem] flex-wrap gap-1.5">
                          {e.matchedKeywords.length > 0 ? (
                            e.matchedKeywords.map((k) => (
                              <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                                {k}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

