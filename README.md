## Performative Male AI (Leaderboard app)

This is a Next.js app that scores uploaded photos for “performativity” and features a public leaderboard. Users can opt in to publish their score, keywords, and an optional social handle. Images are stored in the DB as data URLs but served via cacheable routes, not embedded directly in pages.

---

## Quickstart

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm
- Env vars: `INFERENCE_API_KEY`, `DATABASE_URL`

### Install
```bash
pnpm install
```

Avoid multiple lockfiles. Use pnpm consistently.

### Environment
Create `.env` in project root:
```
INFERENCE_API_KEY=sk-...
DATABASE_URL=postgres://... (Neon)
```

### Run
```bash
pnpm dev
```
Open http://localhost:3000

---

## How it works
- UI: `app/page.tsx` handles upload, scoring, and submission with a leaderboard opt‑in (default true).
- Scoring: `app/api/annotate/route.ts` calls Inference.net (`inference-net/cliptagger-12b`) and returns structured JSON.
- Leaderboard: `app/leaderboard/page.tsx` is a Server Component that streams a shell and renders `components/LeaderboardContent.tsx` with cached top entries (limit 25).
- Image delivery: images are retrieved via `/img/[id]` → redirects to `/img/[id]/[hash]` with strong caching/ETag.
- DB: Neon + Drizzle (`src/db.ts`, `src/schema.ts`).

---

## API

### POST /api/annotate
Scores a base64 data URL image using the upstream model.

Request
```json
{ "imageDataUrl": "data:image/png;base64,AAAA..." }
```

Response (shape)
```json
{ "success": true, "result": { "description": "...", "objects": ["..."], "summary": "..." }, "timings": { "totalMs": 0 } }
```

### POST /api/submit
Saves a scored entry to the leaderboard (deduplicates by image hash or data URL).

Body
```json
{
  "imageDataUrl": "data:image/png;base64,AAAA...",
  "socialPlatform": "twitter|instagram|tiktok",
  "socialHandle": "handle",
  "leaderboardOptIn": true
}
```

Response includes: `id`, `score`, `matchedKeywords`, timestamps, and social fields.

### GET /api/leaderboard
Returns top entries (default limit 25), filterable.

Query params: `minScore`, `limit`, `sort`, `q`, `maleOnly` (default true)

---

## Image routes
- `GET /img/[id]` → 302 to `/img/[id]/[hash]` and sets cache headers.
- `GET /img/[id]/[hash]` → serves bytes with `ETag`, long-lived immutable cache, and content type inferred from data URL.

Use these URLs in the UI, e.g. `/img/123?w=256&fmt=webp&q=70` (query params are ignored by the server and can be used for client hints/CDN transforms).

---

## Dev notes
- Only pnpm is used in this repo.
- The leaderboard Server Component caches only lightweight metadata; image bytes are fetched separately to avoid exceeding Next.js data cache limits.

---

## License
MIT
