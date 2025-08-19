## ClipTagger Demo

ClipTagger Demo is a Next.js app that annotates images and video keyframes using the `inference-net/cliptagger-12b` model via the Inference.net Chat Completions API. It lets you:

- Upload a single image for annotation
- Drop a short video to extract 5 representative frames client‑side and annotate each
- View strict JSON output with timing/attempt metadata
- Copy ready‑to‑use API code samples (cURL, TypeScript, Python)

The server route keeps your API key on the server and returns only the model output to the client.

---

## Quickstart

### Prerequisites
- Node.js 18+ (recommended 20+)
- A package manager (pnpm, npm, or yarn)
- Inference.net API key

### 1) Install dependencies
```bash
pnpm install
# or
npm install
```

Avoid having multiple lockfiles in the project to prevent install/build warnings. Use a single tool consistently.

### 2) Configure environment
Create a `.env` file in the project root:
```bash
INFERENCE_API_KEY=YOUR_API_KEY_HERE
```

### 3) Run the app
```bash
pnpm dev
# or
npm run dev
```

Visit http://localhost:3000 and try uploading an image or a video.

### 4) Production build
```bash
pnpm build && pnpm start
# or
npm run build && npm start
```

---

## How it works

- UI: `app/page.tsx` provides the image flow; `components/VideoAnnotator.tsx` extracts 5 frames from a dropped video and invokes the same API per frame.
- Server: `app/api/annotate/route.ts` calls Inference.net’s Chat Completions endpoint with a strict prompt and returns parsed JSON.
- Prompts: `lib/prompts.ts` contains the system and user prompts that shape the response.
- Code samples: `components/CodeModal.tsx` + `lib/code-snippets/*` show how to call the upstream API directly (cURL, TS, Python).

Key model: `inference-net/cliptagger-12b`

---

## API

### POST /api/annotate
Accepts a base64 data URL for an image and returns structured JSON.

Request body:
```json
{
  "imageDataUrl": "data:image/png;base64,AAAA..."
}
```

Successful response (shape):
```json
{
  "success": true,
  "result": {
    "description": "...",
    "objects": ["..."],
    "actions": ["..."],
    "environment": "...",
    "content_type": "...",
    "specific_style": "...",
    "production_quality": "...",
    "summary": "...",
    "logos": ["..."]
  },
  "usage": {},
  "upstreamStatus": 200,
  "attempts": 1,
  "timings": { "upstreamMs": 0, "totalMs": 0 }
}
```

Error response (example):
```json
{
  "error": "Missing INFERENCE_API_KEY server environment variable"
}
```

Test locally with cURL:
```bash
curl -X POST http://localhost:3000/api/annotate \
  -H 'Content-Type: application/json' \
  -d '{
    "imageDataUrl": "data:image/png;base64,AAAA..."
  }'
```

Security note: the server route reads `INFERENCE_API_KEY` from the server environment and never exposes it to the browser.

---

## Direct API usage (optional)
If you prefer to call Inference.net directly from your own backend, see:
- `lib/code-snippets/curl-code.ts`
- `lib/code-snippets/ts-code.ts`
- `lib/code-snippets/python-code.ts`

These examples target `https://api.inference.net/v1/chat/completions` with the `inference-net/cliptagger-12b` model and a strict JSON response format.

---

## UI notes
- Image upload accepts JPEG/PNG/WebP/GIF (client limit ~4.5MB).
- Video workflow extracts 5 uniformly spaced frames client‑side and annotates each independently.
- Result JSON is syntax‑highlighted and accompanied by timing/attempt metadata.

You can change the number of video frames by editing `NUM_FRAMES` in `components/VideoAnnotator.tsx`.

---

## Tech stack
- Next.js 15, React 19
- Tailwind CSS 4
- Radix UI (Dialog, Tabs)
- lucide-react icons
- highlight.js for code/JSON display

---

## Troubleshooting
- 500 from `/api/annotate`: ensure `INFERENCE_API_KEY` is set server‑side.
- Install/build warning about multiple lockfiles: use a single package manager and delete extra lockfiles.
- Slow or inconsistent upstream responses: the server implements basic retries with backoff; try again or check your network/API quota.

---

## Deploy
On platforms like Vercel:
1. Set `INFERENCE_API_KEY` in your project’s environment variables.
2. Deploy as usual; the app uses Node.js runtime for the API route and does not expose your key to the client.

---

## License
MIT
