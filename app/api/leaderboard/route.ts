import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { entriesTable } from '@/src/schema';
import { and, asc, desc, gte, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const minScore = Math.max(0, Math.min(10, Number(url.searchParams.get('minScore') ?? '3') || 3));
  const limit = (() => {
    const n = Number(url.searchParams.get('limit') ?? '50') || 50;
    return Math.max(1, Math.min(100, n));
  })();
  const sort = (url.searchParams.get('sort') ?? 'score_desc') as 'score_desc' | 'score_asc' | 'time_desc' | 'time_asc';
  const q = (url.searchParams.get('q') ?? '').trim();
  const maleOnlyParam = url.searchParams.get('maleOnly');
  const maleOnly = maleOnlyParam == null ? true : maleOnlyParam !== 'false';

  const conditions = [gte(entriesTable.score, minScore)];
  if (maleOnly) {
    conditions.push(sql`${entriesTable.resultJson} ~* ${"\\y(man|male|guy|boy|gentleman|dude|men|boys|guys|person)\\y"}`);
  }
  if (q) {
    const like = `%${q}%`;
    conditions.push(sql`(${entriesTable.matchedKeywords} ILIKE ${like} OR ${entriesTable.resultJson} ILIKE ${like})`);
  }

  const orderings = (() => {
    switch (sort) {
      case 'time_desc':
        return [desc(entriesTable.createdAt)];
      case 'time_asc':
        return [asc(entriesTable.createdAt)];
      case 'score_asc':
        return [asc(entriesTable.score), desc(entriesTable.createdAt)];
      case 'score_desc':
      default:
        return [desc(entriesTable.score), desc(entriesTable.createdAt)];
    }
  })();

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
    .where(and(...conditions))
    .orderBy(...orderings)
    .limit(limit);

  return NextResponse.json({
    success: true,
    entries: rows.map((r) => ({
      ...r,
      matchedKeywords: r.matchedKeywords?.split(',').filter(Boolean) ?? [],
      createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
      socialPlatform: r.socialPlatform ?? null,
      socialUrl: r.socialUrl ?? null,
      podiumOptIn: Boolean(r.podiumOptIn),
    })),
  });
}

