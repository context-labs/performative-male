import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT, USER_PROMPT } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INFERENCE_API_URL = "https://api.inference.net/v1/chat/completions";
const MODEL_NAME = "inference-net/cliptagger-12b";

type ClipTaggerResult = {
  description: string;
  objects: string[];
  actions: string[];
  environment: string;
  content_type: string;
  specific_style: string;
  production_quality: string;
  summary: string;
  logos: string[];
};

type AnnotateRequest = {
  imageDataUrl: string;
};

function isLikelyDataUrl(value: string): boolean {
  return /^data:[^;]+;base64,.+/.test(value);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const envApiKey = process.env.INFERENCE_API_KEY;
  if (!envApiKey) {
    return NextResponse.json(
      { error: "Missing INFERENCE_API_KEY server environment variable" },
      { status: 500 }
    );
  }

  let body: AnnotateRequest | null = null;
  try {
    body = (await request.json()) as AnnotateRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || typeof body.imageDataUrl !== "string") {
    return NextResponse.json(
      { error: "Expected 'imageDataUrl' string in request body" },
      { status: 400 }
    );
  }

  if (!isLikelyDataUrl(body.imageDataUrl)) {
    return NextResponse.json(
      { error: "'imageDataUrl' must be a base64 data URL (data:<mime>;base64,...)" },
      { status: 400 }
    );
  }

  const startedAt = Date.now();
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: unknown = null;
  let lastUpstreamMs = 0;
  let upstreamStatus: number | null = null;
  let upstreamUsage: unknown = null;
  let parsedResult: ClipTaggerResult | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const upstreamBody = {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: { url: body.imageDataUrl, detail: "high" },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      } as const;

      const t0 = Date.now();
      const resp = await fetch(INFERENCE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${envApiKey}`,
        },
        body: JSON.stringify(upstreamBody),
      });
      lastUpstreamMs = Date.now() - t0;
      upstreamStatus = resp.status;

      if (!resp.ok) {
        // Retry on rate limit, timeouts, or server errors
        if ([408, 409, 425, 429, 500, 502, 503, 504].includes(resp.status)) {
          const errorPayload = await safeJson(resp);
          lastError = { status: resp.status, error: errorPayload };
          // Exponential backoff with jitter
          const delay = attempt === 1 ? 400 : attempt === 2 ? 900 : 1500;
          await sleep(delay + Math.floor(Math.random() * 200));
          continue;
        } else {
          const errorPayload = await safeJson(resp);
          return NextResponse.json(
            {
              error: "Upstream request failed",
              details: errorPayload,
              upstreamStatus,
              timings: {
                upstreamMs: lastUpstreamMs,
                totalMs: Date.now() - startedAt,
              },
              attempts: attempt,
            },
            { status: 502 }
          );
        }
      }

      const data = await resp.json();
      upstreamUsage = data?.usage ?? null;
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        lastError = { message: "No content in upstream response" };
        const delay = attempt === 1 ? 400 : attempt === 2 ? 900 : 1500;
        await sleep(delay + Math.floor(Math.random() * 200));
        continue;
      }

      try {
        parsedResult = JSON.parse(content) as ClipTaggerResult;
      } catch {
        lastError = { message: "Failed to parse JSON content", contentSnippet: content.slice(0, 200) };
        const delay = attempt === 1 ? 400 : attempt === 2 ? 900 : 1500;
        await sleep(delay + Math.floor(Math.random() * 200));
        continue;
      }

      // Success
      return NextResponse.json({
        success: true,
        result: parsedResult,
        usage: upstreamUsage,
        upstreamStatus,
        attempts: attempt,
        timings: {
          upstreamMs: lastUpstreamMs,
          totalMs: Date.now() - startedAt,
        },
      });
    } catch (err) {
      lastError = err;
      const delay = attempt === 1 ? 400 : attempt === 2 ? 900 : 1500;
      await sleep(delay + Math.floor(Math.random() * 200));
      continue;
    }
  }

  return NextResponse.json(
    {
      error: "Annotation failed after retries",
      lastError,
      upstreamStatus,
      attempts: attempt,
      timings: {
        upstreamMs: lastUpstreamMs,
        totalMs: Date.now() - startedAt,
      },
    },
    { status: 504 }
  );
}

async function safeJson(resp: Response) {
  try {
    return await resp.json();
  } catch {
    try {
      return await resp.text();
    } catch {
      return null;
    }
  }
}

