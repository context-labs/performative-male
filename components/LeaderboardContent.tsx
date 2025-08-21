import { db } from "@/src/db";
import { entriesTable } from "@/src/schema";
import { and, desc, gte, sql } from "drizzle-orm";
import { ExpandableImage } from "@/components/ExpandableImage";
import { Podium } from "@/components/Podium";
import { unstable_cache } from "next/cache";

type Entry = {
  id: number;
  imageId: number;
  imageHash?: string | null;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
  socialPlatform?: "twitter" | "instagram" | "tiktok" | null;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
};

type EntryMeta = {
  id: number;
  imageHash?: string | null;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
  socialPlatform?: "twitter" | "instagram" | "tiktok" | null;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
};

const getTopEntryMetas = unstable_cache(async (): Promise<EntryMeta[]> => {
  const rows = await db
    .select({
      id: entriesTable.id,
      imageHash: entriesTable.imageHash,
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
        sql`${entriesTable.resultJson} ~* ${"\\y(man|male|guy|boy|gentleman|dude|men|boys|guys|person)\\y"}`,
        sql`${entriesTable.podiumOptIn} = true`
      )
    )
    .orderBy(desc(entriesTable.score), desc(entriesTable.createdAt))
    .limit(25);

  return rows.map((r) => ({
    id: r.id!,
    imageHash: (r as { imageHash?: string | null }).imageHash ?? null,
    score: r.score!,
    matchedKeywords: (r.matchedKeywords ?? '').split(',').filter(Boolean),
    createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
    socialPlatform: (r as { socialPlatform?: 'twitter' | 'instagram' | 'tiktok' | null }).socialPlatform ?? null,
    socialUrl: (r as { socialUrl?: string | null }).socialUrl ?? null,
    podiumOptIn: Boolean((r as { podiumOptIn?: boolean }).podiumOptIn),
  }));
}, ["leaderboard-top-25-metas"], { revalidate: 60 });

export default async function LeaderboardContent() {
  const metas = await getTopEntryMetas();
  // No need to fetch image bytes or base64 here; just use the id to build URL

  const entries: Entry[] = metas.map((m) => ({
    id: m.id,
    imageId: m.id,
    imageHash: m.imageHash ?? null,
    score: m.score,
    matchedKeywords: m.matchedKeywords,
    createdAt: m.createdAt,
    socialPlatform: m.socialPlatform ?? null,
    socialUrl: m.socialUrl ?? null,
    podiumOptIn: m.podiumOptIn,
  }));

  return (
    <>
      {/* Podium for top 3 (only entries that opted into leaderboard display) */}
      <Podium entries={entries.slice(0, 3)} />

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
                  <ExpandableImage src={`/img/${e.imageId}/${e.imageHash ?? 'x'}?w=256&fmt=webp&q=70`} alt={`Entry ${e.id}`} loading={i < 6 ? 'eager' : 'lazy'} fetchPriority={i < 6 ? 'high' : 'auto'} className="h-full w-full object-cover" />
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
                            src={`/img/${e.imageId}/${e.imageHash ?? 'x'}?w=128&fmt=webp&q=70`}
                            alt={`Entry ${e.id}`}
                            loading={i < 6 ? 'eager' : 'lazy'}
                            fetchPriority={i < 6 ? 'high' : 'auto'}
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
    </>
  );
}

