import { ExpandableImage } from "@/components/ExpandableImage";
import { cn } from "@/lib/utils";

export type PodiumEntry = {
  id: number;
  imageId: number;
  imageHash?: string | null;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
  socialPlatform?: 'twitter' | 'instagram' | 'tiktok' | null;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
};

export type PodiumProps = {
  entries: PodiumEntry[];
  className?: string;
};

function scorePillClass(score: number) {
  if (score >= 8) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (score >= 5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type RankCardProps = {
  rank: 1 | 2 | 3;
  entry: PodiumEntry;
};

function RankCard({ rank, entry }: RankCardProps) {
  const isFirst = rank === 1;
  const imageHeight = isFirst ? "h-[260px] sm:h-[320px]" : "h-[200px] sm:h-[240px]";
  const hasSocial = !!entry.socialUrl && entry.podiumOptIn !== false;

  const renderSocial = () => {
    if (!hasSocial) return null;
    const url = entry.socialUrl as string;
    const label =
      entry.socialPlatform === 'twitter' ? 'X' :
      entry.socialPlatform === 'instagram' ? 'Instagram' :
      entry.socialPlatform === 'tiktok' ? 'TikTok' : null;
    if (!label) return null;
    let handle = '';
    try {
      const u = new URL(url);
      const seg = u.pathname.split('/').filter(Boolean)[0] ?? '';
      if (seg) handle = `@${seg}`;
    } catch {
      /* noop */
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
        <span className="rounded-xs bg-muted px-1.5 py-0.5 text-[10px] font-medium">{label}</span>
        <span>{handle}</span>
      </a>
    );
  };

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-3 sm:p-4"
      )}
      aria-label={`Rank ${rank}`}
    >
      <div className={cn("relative overflow-hidden rounded-md bg-muted", imageHeight)}>
        <ExpandableImage
          src={`/img/${entry.imageId}/${entry.imageHash ?? 'x'}?w=${isFirst ? 1024 : 800}&fmt=webp&q=72`}
          alt={`Rank ${rank} submission`}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-contain"
        />

        {/* rank chip */}
        <div className="absolute left-2 top-2">
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
            #{rank}
          </span>
        </div>

        {/* score pill */}
        <div className="absolute right-2 top-2">
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", scorePillClass(entry.score))}>
            {entry.score}/10
          </span>
        </div>
      </div>
      <div className="mt-2 text-center text-[11px] text-muted-foreground" aria-label="Submitted time">
        {formatTime(entry.createdAt)}
      </div>
      {hasSocial && (
        <div className="mt-1 text-center">
          {renderSocial()}
        </div>
      )}
    </div>
  );
}

export function Podium({ entries, className }: PodiumProps) {
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  return (
    <section aria-label="Podium" className={cn("rounded-xl border p-4 sm:p-6", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Podium</h2>
        <div className="text-xs text-muted-foreground">Top 3 entries</div>
      </div>
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
        {/* Second */}
        <div className="sm:order-1 sm:translate-y-2">
          {second ? (
            <RankCard rank={2} entry={second} />
          ) : (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">—</div>
          )}
        </div>
        {/* First */}
        <div className="sm:order-2">
          {first ? (
            <div className="-translate-y-1 sm:-translate-y-2">
              <RankCard rank={1} entry={first} />
            </div>
          ) : (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">—</div>
          )}
        </div>
        {/* Third */}
        <div className="sm:order-3 sm:translate-y-3">
          {third ? (
            <RankCard rank={3} entry={third} />
          ) : (
            <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">—</div>
          )}
        </div>
      </div>
    </section>
  );
}

