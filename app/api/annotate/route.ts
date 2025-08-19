import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INFERENCE_API_URL = "https://api.inference.net/v1/chat/completions";
const MODEL_NAME = "inference-net/cliptagger-12b";

const SYSTEM_PROMPT =
  "You are an image annotation API trained to analyze YouTube video keyframes. You will be given instructions on the output format, what to caption, and how to perform your job. Follow those instructions. For descriptions and summaries, provide them directly and do not lead them with 'This image shows' or 'This keyframe displays...', just get right into the details.";

const USER_PROMPT = `You are an image annotation API trained to analyze YouTube video keyframes. You must respond with a valid JSON object matching the exact structure below.

Your job is to extract detailed **factual elements directly visible** in the image. Do not speculate or interpret artistic intent, camera focus, or composition. Do not include phrases like "this appears to be", "this looks like", or anything about the image itself. Describe what **is physically present in the frame**, and nothing more.

Return JSON in this structure:

{
    "description": "A detailed, factual account of what is visibly happening (4 sentences max). Only mention concrete elements or actions that are clearly shown. Do not include anything about how the image is styled, shot, or composed. Do not lead the description with something like 'This image shows' or 'this keyframe is...', just get right into the details.",
    "objects": ["object1 with relevant visual details", "object2 with relevant visual details", ...],
    "actions": ["action1 with participants and context", "action2 with participants and context", ...],
    "environment": "Detailed factual description of the setting and atmosphere based on visible cues (e.g., interior of a classroom with fluorescent lighting, or outdoor forest path with snow-covered trees).",
    "content_type": "The type of content it is, e.g. 'real-world footage', 'video game', 'animation', 'cartoon', 'CGI', 'VTuber', etc.",
    "specific_style": "Specific genre, aesthetic, or platform style (e.e., anime, 3D animation, mobile gameplay, vlog, tutorial, news broadcast, etc.)",
    "production_quality": "Visible production level: e.g., 'professional studio', 'amateur handheld', 'webcam recording', 'TV broadcast', etc.",
    "summary": "One clear, comprehensive sentence summarizing the visual content of the frame. Like the description, get right to the point.",
    "logos": ["logo1 with visual description", "logo2 with visual description", ...]
}

Rules:
- Be specific and literal. Focus on what is explicitly visible.
- Do NOT include interpretations of emotion, mood, or narrative unless it's visually explicit.
- No artistic or cinematic analysis.
- Always include the language of any text in the image if present as an object, e.g. "English text", "Japanese text", "Russian text", etc.
- Maximum 10 objects and 5 actions.
- Return an empty array for 'logos' if none are present.
- Always output strictly valid JSON with proper escaping.
- Output **only the JSON**, no extra text or explanation.`;

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

