import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import { entriesTable } from '@/src/schema';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const idParam = segments[segments.length - 1] ?? '';
  const idNum = Number(idParam);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return new NextResponse('Invalid id', { status: 400 });
  }

  const rows = await db
    .select({
      imageDataUrl: entriesTable.imageDataUrl,
      imageHash: entriesTable.imageHash,
      createdAt: entriesTable.createdAt,
    })
    .from(entriesTable)
    .where(eq(entriesTable.id, idNum))
    .limit(1);

  if (rows.length === 0) {
    return new NextResponse('Not found', { status: 404 });
  }

  const row = rows[0] as { imageDataUrl: string; imageHash: string | null; createdAt: Date | null };
  const dataUrl = row.imageDataUrl ?? '';
  const commaIndex = dataUrl.indexOf(',');
  const header = commaIndex >= 0 ? dataUrl.slice(0, commaIndex) : '';
  const base64Part = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

  let mime = 'application/octet-stream';
  if (header.startsWith('data:')) {
    const semiIndex = header.indexOf(';', 5);
    if (semiIndex > 5) {
      const parsed = header.slice(5, semiIndex);
      if (parsed) mime = parsed;
    }
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Part, 'base64');
  } catch {
    return new NextResponse('Invalid image data', { status: 500 });
  }

  const hash = row.imageHash ?? crypto.createHash('sha256').update(buffer).digest('hex');
  const etag = `"${hash}"`;
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const headers = new Headers({
    'Content-Type': mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'ETag': etag,
    'Content-Length': String(buffer.length),
    'Accept-Ranges': 'bytes',
  });

  try {
    const mtime = row.createdAt ? new Date(row.createdAt).toUTCString() : null;
    if (mtime) headers.set('Last-Modified', mtime);
  } catch {
    // ignore invalid dates
  }

  return new NextResponse(buffer, { status: 200, headers });
}

