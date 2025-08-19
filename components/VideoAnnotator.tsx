"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, Loader2, Wand2, RotateCcw, Trash2, ImagePlus, Timer, BarChart3, AlertTriangle } from "lucide-react";
import { Stat } from "@/components/Stat";

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

type ApiSuccess = {
  success: true;
  result: ClipTaggerResult;
  usage: unknown;
  upstreamStatus: number | null;
  attempts: number;
  timings: { upstreamMs: number; totalMs: number };
};

type ApiError = {
  error: string;
  attempts?: number;
  timings?: { upstreamMs: number; totalMs: number };
  upstreamStatus?: number | null;
  details?: unknown;
};

type FrameOutcome = {
  index: number;
  ok: boolean;
  result?: ClipTaggerResult;
  error?: string;
  meta: {
    attempts: number;
    upstreamMs: number;
    totalMs: number;
    upstreamStatus: number | null;
    clientMs: number;
  };
};

// Using shared Stat component

const NUM_FRAMES = 5;
const MAX_CANVAS_SIDE = 640; // downscale for faster upload and smaller payloads

export default function VideoAnnotator() {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [annotating, setAnnotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<FrameOutcome[] | null>(null);

  const reset = useCallback(() => {
    setFrames([]);
    setOutcomes(null);
    setError(null);
  }, []);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleVideoFile(file);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleVideoFile(file);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  async function handleVideoFile(file: File) {
    reset();
    if (!file.type.startsWith("video/")) {
      setError("Unsupported file type. Please choose a video file.");
      return;
    }
    setVideoFile(file);
    try {
      setExtracting(true);
      const { frames: frameUrls, duration: videoDuration } = await extractFrames(file, NUM_FRAMES);
      setFrames(frameUrls);
      setDuration(videoDuration);
    } catch {
      setError("Failed to extract frames from video");
    } finally {
      setExtracting(false);
    }
  }

  async function extractFrames(file: File, count: number): Promise<{ frames: string[]; duration: number }> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.src = objectUrl;
      video.crossOrigin = "anonymous";
      video.muted = true;

      await waitForEvent(video, "loadedmetadata");
      const duration = Math.max(0.000001, video.duration || 0.000001);
      const [targetWidth, targetHeight] = computeScaledDimensions(video.videoWidth, video.videoHeight, MAX_CANVAS_SIDE);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unsupported");

      const times = chooseUniformTimes(duration, count);
      const urls: string[] = [];
      for (const t of times) {
        await seekVideo(video, t);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const url = canvas.toDataURL("image/jpeg", 0.85);
        urls.push(url);
      }
      return { frames: urls, duration };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function chooseUniformTimes(duration: number, count: number): number[] {
    const times: number[] = [];
    for (let i = 0; i < count; i++) {
      const t = ((i + 1) / (count + 1)) * duration;
      times.push(Math.min(duration - 0.000001, Math.max(0, t)));
    }
    return times;
  }

  function computeScaledDimensions(width: number, height: number, maxSide: number): [number, number] {
    if (!width || !height) return [512, 512];
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return [Math.round(width * scale), Math.round(height * scale)];
  }

  function waitForEvent(el: HTMLElement | HTMLMediaElement, event: string) {
    return new Promise<void>((resolve, reject) => {
      const onError = () => {
        cleanup();
        reject(new Error("Media error"));
      };
      const onOk = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        el.removeEventListener(event, onOk);
        el.removeEventListener("error", onError);
      };
      el.addEventListener(event, onOk, { once: true });
      el.addEventListener("error", onError, { once: true });
    });
  }

  function seekVideo(video: HTMLVideoElement, time: number) {
    return new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Seek failed"));
      };
      const cleanup = () => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("error", onError, { once: true });
      try {
        video.currentTime = Math.min(Math.max(0, time), Math.max(0.000001, video.duration || 0.000001) - 0.000001);
      } catch {
        // some browsers throw while seeking; let error handler capture
      }
    });
  }

  const annotate = async () => {
    if (frames.length === 0 || annotating) return;
    setError(null);
    setOutcomes(null);
    setAnnotating(true);
    try {
      const results = await Promise.all(
        frames.map((imageDataUrl, index) => annotateOne(imageDataUrl, index))
      );
      setOutcomes(results);
    } catch {
      setError("Network error");
    } finally {
      setAnnotating(false);
    }
  };

  async function annotateOne(imageDataUrl: string, index: number): Promise<FrameOutcome> {
    const t0 = Date.now();
    const resp = await fetch("/api/annotate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl }),
    });
    const clientMs = Date.now() - t0;
    const json = (await resp.json()) as ApiSuccess | ApiError;
    if (resp.ok && (json as ApiSuccess).success) {
      const ok = json as ApiSuccess;
      return {
        index,
        ok: true,
        result: ok.result,
        meta: {
          attempts: ok.attempts,
          upstreamMs: ok.timings.upstreamMs,
          totalMs: ok.timings.totalMs,
          upstreamStatus: ok.upstreamStatus ?? null,
          clientMs,
        },
      };
    } else {
      const err = json as ApiError;
      return {
        index,
        ok: false,
        error: err.error || "Request failed",
        meta: {
          attempts: err.attempts ?? 0,
          upstreamMs: err.timings?.upstreamMs ?? 0,
          totalMs: err.timings?.totalMs ?? 0,
          upstreamStatus: err.upstreamStatus ?? null,
          clientMs,
        },
      };
    }
  }

  const removeVideo = () => {
    setVideoFile(null);
    setDuration(null);
    reset();
  };

  const hasFrames = frames.length > 0;

  return (
    <section>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-6 sm:p-8 transition-colors",
          dragActive ? "border-primary/60 bg-muted/50" : "border-border bg-card/60"
        )}
      >
        {!videoFile ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full size-14 grid place-items-center border">
              <ImagePlus className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="text-base sm:text-lg font-medium">Drop a video here</div>
              <div className="text-xs sm:text-sm text-muted-foreground">or</div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
                <Upload className="size-4" />
                <span>Upload video</span>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={onFileChange} className="sr-only" />
              </label>
              <div className="text-xs text-muted-foreground">MP4 · WebM · MOV</div>
            </div>
            {error && (
              <div className="rounded-lg border bg-destructive/10 text-destructive p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                <RotateCcw className="size-4" />
                <span>Replace</span>
                <input ref={videoInputRef} type="file" accept="video/*" onChange={onFileChange} className="sr-only" />
              </label>
              <button type="button" onClick={removeVideo} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Trash2 className="size-4" /> Remove
              </button>
            </div>

            {duration !== null && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Stat icon={Timer} label="Duration" value={`${duration.toFixed(2)} s`} />
                <Stat icon={BarChart3} label="Frames" value={frames.length} />
              </div>
            )}

            {extracting ? (
              <div className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Extracting frames…
              </div>
            ) : hasFrames ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {frames.map((f, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={f} alt={`Frame ${i + 1}`} className="w-full h-auto rounded border bg-black/5 object-contain" />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={annotate}
                    disabled={annotating}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground",
                      annotating ? "cursor-not-allowed opacity-70" : "hover:bg-primary/90"
                    )}
                  >
                    {annotating ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Annotate 5 frames
                  </button>
                </div>

                {error && (
                  <div className="rounded-lg border bg-destructive/10 text-destructive p-3 text-sm flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5" />
                    <div>{error}</div>
                  </div>
                )}

                {outcomes ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {outcomes
                      .slice()
                      .sort((a, b) => a.index - b.index)
                      .map((o) => (
                        <div key={o.index} className="rounded-lg border overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                            <div className="text-sm font-medium">Frame {o.index + 1}</div>
                          </div>
                          <div className="p-3 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <Stat icon={Timer} label="Upstream" value={`${o.meta.upstreamMs} ms`} />
                              <Stat icon={Timer} label="Server total" value={`${o.meta.totalMs} ms`} />
                              <Stat icon={Timer} label="Client" value={`${o.meta.clientMs} ms`} />
                              <Stat icon={BarChart3} label="Attempts" value={o.meta.attempts} />
                              <Stat icon={BarChart3} label="Upstream status" value={o.meta.upstreamStatus ?? "-"} />
                            </div>

                            {o.ok ? (
                              <pre className="p-3 whitespace-pre-wrap break-words text-xs leading-5 bg-card">
                                <code className="language-json">{JSON.stringify(o.result, null, 2)}</code>
                              </pre>
                            ) : (
                              <div className="rounded-lg border bg-destructive/10 text-destructive p-3 text-sm flex items-start gap-2">
                                <AlertTriangle className="size-4 mt-0.5" />
                                <div>{o.error}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    {annotating ? (
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Annotating…
                      </div>
                    ) : (
                      <div>Results will appear here after you annotate.</div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

