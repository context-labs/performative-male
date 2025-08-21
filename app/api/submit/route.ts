import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { entriesTable } from '@/src/schema';
import { computeScore } from '@/src/scoring';
import { ClipTaggerResult } from '@/src/types';
import { eq, or } from 'drizzle-orm';
import crypto from 'node:crypto';
import { SYSTEM_PROMPT, USER_PROMPT } from '@/lib/prompts';
import z from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const envApiKey = process.env.INFERENCE_API_KEY;
  if (!envApiKey) {
    return NextResponse.json({ error: 'Missing INFERENCE_API_KEY server environment variable' }, { status: 500 });
  }

  // Validate input with Zod
  const BodySchema = z.object({
    imageDataUrl: z.string().regex(/^data:[^;]+;base64,.+/, 'imageDataUrl must be a base64 data URL'),
    socialPlatform: z.enum(['twitter', 'instagram', 'tiktok']).optional(),
    socialHandle: z.string().trim().regex(/^[A-Za-z0-9._]{1,30}$/).optional(),
    // Accept both names for compatibility
    podiumOptIn: z.boolean().optional(),
    leaderboardOptIn: z.boolean().optional(),
  });

  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Optional: validate social URL and platform/handle
  let socialPlatform: 'twitter' | 'instagram' | 'tiktok' | null = null;
  let socialUrl: string | null = null;
  if (body.socialPlatform && body.socialHandle) {
    const handle = body.socialHandle.replace(/^@+/, '').trim();
    socialPlatform = body.socialPlatform;
    const base = socialPlatform === 'twitter' ? 'https://x.com' : socialPlatform === 'instagram' ? 'https://instagram.com' : 'https://tiktok.com/@';
    socialUrl = socialPlatform === 'tiktok' ? `${base}${handle}` : `${base}/${handle}`;
  }

  const podiumOptIn = body.leaderboardOptIn ?? body.podiumOptIn ?? true;

  const imageDataUrl = body.imageDataUrl;

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

  // Prevent duplicate submissions of the exact same photo by hash (preferred) or data URL
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
        ? or(eq(entriesTable.imageHash, imageHash), eq(entriesTable.imageDataUrl, imageDataUrl))
        : eq(entriesTable.imageDataUrl, imageDataUrl)
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Duplicate image (already submitted)' }, { status: 409 });
  }

  // If not duplicate, run annotation upstream, compute score, insert, and return
  const annotation = await annotateViaClipTagger(envApiKey, imageDataUrl);
  if (!annotation.ok) {
    const { status, error } = annotation;
    return NextResponse.json({ error }, { status });
  }
  const result = annotation.result as ClipTaggerResult;
  const { score, matched } = computeScore(result);

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
      result,
    });
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      // Unique violation (likely image_hash). Treat as duplicate.
      return NextResponse.json({ error: 'Duplicate image (already submitted)' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

async function annotateViaClipTagger(apiKey: string, imageDataUrl: string): Promise<{ ok: true; result: ClipTaggerResult } | { ok: false; status: number; error: string }> {
  const INFERENCE_API_URL = 'https://api.inference.net/v1/chat/completions';
  const MODEL_NAME = 'inference-net/cliptagger-12b';
  const maxAttempts = 3;
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const upstreamBody = {
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: USER_PROMPT },
              { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      } as const;

      const resp = await fetch(INFERENCE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(upstreamBody),
      });
      if (!resp.ok) {
        if ([408, 409, 425, 429, 500, 502, 503, 504].includes(resp.status)) {
          await sleep(attempt === 1 ? 400 : attempt === 2 ? 900 : 1500);
          continue;
        }
        return { ok: false, status: 502, error: 'Upstream request failed' };
      }
      const data = await resp.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        await sleep(attempt === 1 ? 400 : attempt === 2 ? 900 : 1500);
        continue;
      }
      const parsed = JSON.parse(content) as ClipTaggerResult;
      return { ok: true, result: parsed };
    } catch {
      await sleep(attempt === 1 ? 400 : attempt === 2 ? 900 : 1500);
      continue;
    }
  }
  return { ok: false, status: 504, error: 'Annotation failed after retries' };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

