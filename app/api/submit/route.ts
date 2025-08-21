import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { entriesTable } from '@/src/schema';
import { computeScore } from '@/src/scoring';
import { SubmitPayload } from '@/src/types';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { imageDataUrl, result, podiumOptIn: rawPodiumOptIn, socialPlatform: rawPlatform, socialHandle: rawHandle } = (payload || {}) as SubmitPayload;
  // Optional: validate social URL and platform/handle
  let socialPlatform: 'twitter' | 'instagram' | 'tiktok' | null = null;
  let socialUrl: string | null = null;
  const allowedPlatforms = new Set(['twitter', 'instagram', 'tiktok']);
  const sanitizeHandle = (h: string) => h.replace(/^@+/, '').trim();
  const isValidHandle = (h: string) => /^[A-Za-z0-9._]{1,30}$/.test(h);

  // Prefer platform + handle if provided
  if (rawPlatform && allowedPlatforms.has(rawPlatform as string) && typeof rawHandle === 'string' && rawHandle.trim()) {
    const handle = sanitizeHandle(rawHandle);
    if (isValidHandle(handle)) {
      socialPlatform = rawPlatform as 'twitter' | 'instagram' | 'tiktok';
      const base = socialPlatform === 'twitter' ? 'https://x.com' : socialPlatform === 'instagram' ? 'https://instagram.com' : 'https://tiktok.com/@';
      socialUrl = socialPlatform === 'tiktok' ? `${base}${handle}` : `${base}/${handle}`;
    }
  }

  const podiumOptIn = rawPodiumOptIn === false ? false : true;
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return NextResponse.json({ error: 'imageDataUrl required' }, { status: 400 });
  }
  if (!result) {
    return NextResponse.json({ error: 'result required' }, { status: 400 });
  }

  const { score, matched } = computeScore(result);

  // Compute a SHA-256 hash of the decoded image bytes for robust deduplication
  let imageHash: string | null = null;
  try {
    const commaIndex = imageDataUrl.indexOf(',');
    const base64Part = commaIndex >= 0 ? imageDataUrl.slice(commaIndex + 1) : imageDataUrl;
    const buffer = Buffer.from(base64Part, 'base64');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    imageHash = hash;
  } catch {
    imageHash = null;
  }

  // Prevent duplicate submissions of the exact same photo by data URL
  const existing = await db
    .select({
      id: entriesTable.id,
      score: entriesTable.score,
      matchedKeywords: entriesTable.matchedKeywords,
      createdAt: entriesTable.createdAt,
      socialPlatform: entriesTable.socialPlatform,
      socialUrl: entriesTable.socialUrl,
      podiumOptIn: entriesTable.podiumOptIn,
    })
    .from(entriesTable)
    .where(
      imageHash
        ? or(eq(entriesTable.imageDataUrl, imageDataUrl), eq(entriesTable.imageHash, imageHash))
        : eq(entriesTable.imageDataUrl, imageDataUrl)
    )
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return NextResponse.json({
      success: true,
      id: row.id,
      score: row.score,
      matchedKeywords: row.matchedKeywords?.split(',').filter(Boolean) ?? [],
      createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
      socialPlatform: row.socialPlatform ?? null,
      socialUrl: row.socialUrl ?? null,
      podiumOptIn: Boolean(row.podiumOptIn),
    });
  }

  try {
    const inserted = await db
      .insert(entriesTable)
      .values({
        imageDataUrl,
        imageHash: imageHash ?? undefined,
        resultJson: JSON.stringify(result),
        score,
        matchedKeywords: matched.join(','),
        socialPlatform: socialPlatform ?? undefined,
        socialUrl: socialUrl ?? undefined,
        podiumOptIn,
      })
      .returning({ id: entriesTable.id, createdAt: entriesTable.createdAt, socialPlatform: entriesTable.socialPlatform, socialUrl: entriesTable.socialUrl, podiumOptIn: entriesTable.podiumOptIn });

    const row = inserted[0];
    return NextResponse.json({
      success: true,
      id: row.id,
      score,
      matchedKeywords: matched,
      createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
      socialPlatform: row.socialPlatform ?? null,
      socialUrl: row.socialUrl ?? null,
      podiumOptIn: Boolean(row.podiumOptIn),
    });
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      // Unique violation, likely on image_hash: fetch and return existing row
      const dupe = await db
        .select({
          id: entriesTable.id,
          score: entriesTable.score,
          matchedKeywords: entriesTable.matchedKeywords,
          createdAt: entriesTable.createdAt,
        })
        .from(entriesTable)
        .where(
          imageHash
            ? or(eq(entriesTable.imageHash, imageHash), eq(entriesTable.imageDataUrl, imageDataUrl))
            : eq(entriesTable.imageDataUrl, imageDataUrl)
        )
        .limit(1);
      if (dupe.length > 0) {
        const row = dupe[0];
        return NextResponse.json({
          success: true,
          id: row.id,
          score: row.score,
          matchedKeywords: row.matchedKeywords?.split(',').filter(Boolean) ?? [],
          createdAt: row.createdAt?.toISOString?.() ?? new Date().toISOString(),
        });
      }
    }
    // Fallback error
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

