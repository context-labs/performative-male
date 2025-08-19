"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, Loader2, Trash2, Wand2, RotateCcw, Code2 } from "lucide-react";
import { CodeModal } from "@/components/CodeModal";
import VideoAnnotator from "@/components/VideoAnnotator";
import { Stat } from "@/components/Stat";
import { ErrorAlert } from "@/components/ErrorAlert";
import { ApiMetaStats } from "@/components/ApiMetaStats";
import { JsonResultPanel } from "@/components/JsonResultPanel";
import { EmptyUploadState } from "@/components/EmptyUploadState";
import { ModelIntro } from "@/components/ModelIntro";

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

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{
    width: number;
    height: number;
    size: number;
    type: string;
  } | null>(null);

  const [annotating, setAnnotating] = useState(false);
  const [apiMeta, setApiMeta] = useState<{
    attempts: number;
    upstreamMs: number;
    totalMs: number;
    upstreamStatus: number | null;
    usage: unknown;
    clientMs: number;
  } | null>(null);
  const [result, setResult] = useState<ClipTaggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  // Removed separate codeRef; highlighting handled in JsonResultPanel

  const hasImage = Boolean(imageDataUrl);

  const resetResult = useCallback(() => {
    setResult(null);
    setApiMeta(null);
    setError(null);
  }, []);

  const revokeAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const setImageFromFile = useCallback(
    async (file: File) => {
      setNotice(null);
      resetResult();
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`Image exceeds ${MAX_IMAGE_BYTES / 1024 / 1024}MB limit.`);
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setImageDataUrl(dataUrl);

        // measure dimensions
        const probe = new Image();
        probe.onload = () => {
          setImageInfo({
            width: probe.width,
            height: probe.height,
            size: file.size,
            type: file.type,
          });
        };
        probe.src = dataUrl;
      } catch {
        setError("Failed to load image");
      }
    },
    [resetResult]
  );

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await setImageFromFile(file);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await setImageFromFile(file);
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

  const onPaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], blob.name || "pasted-image", {
              type: blob.type,
            });
            await setImageFromFile(file);
            setNotice("Pasted image captured");
            return;
          }
        }
      }
    },
    [setImageFromFile]
  );

  useEffect(() => {
    const handler = (e: ClipboardEvent) => onPaste(e);
    // Listen at window-level and in capture phase so paste works anywhere on the page
    window.addEventListener("paste", handler as unknown as EventListener, true);
    return () => {
      window.removeEventListener("paste", handler as unknown as EventListener, true);
    };
  }, [onPaste]);

  const formatBytes = (n?: number | null) => {
    if (!n && n !== 0) return "-";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };

  const annotate = async () => {
    if (!imageDataUrl || annotating) return;
    setError(null);
    setResult(null);
    setApiMeta(null);
    setAnnotating(true);
    revokeAbort();
    const controller = new AbortController();
    abortRef.current = controller;

    const clientStart = Date.now();
    try {
      const resp = await fetch("/api/annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
        signal: controller.signal,
      });
      const json = (await resp.json()) as ApiSuccess | ApiError;
      const clientMs = Date.now() - clientStart;
      if (resp.ok && (json as ApiSuccess).success) {
        const ok = json as ApiSuccess;
        setResult(ok.result);
        setApiMeta({
          attempts: ok.attempts,
          upstreamMs: ok.timings.upstreamMs,
          totalMs: ok.timings.totalMs,
          upstreamStatus: ok.upstreamStatus ?? null,
          usage: ok.usage ?? null,
          clientMs,
        });
      } else {
        const err = json as ApiError;
        setError(err.error || "Request failed");
        setApiMeta({
          attempts: err.attempts ?? 0,
          upstreamMs: err.timings?.upstreamMs ?? 0,
          totalMs: err.timings?.totalMs ?? 0,
          upstreamStatus: err.upstreamStatus ?? null,
          usage: err.details ?? null,
          clientMs,
        });
      }
    } catch (err: unknown) {
      const isAbort =
        err instanceof DOMException
          ? err.name === "AbortError"
          : typeof err === "object" &&
            err !== null &&
            "name" in err &&
            (err as { name?: string }).name === "AbortError";
      if (isAbort) {
        setError("Annotation canceled");
      } else {
        setError("Network error");
      }
    } finally {
      setAnnotating(false);
      abortRef.current = null;
    }
  };

  // Syntax highlighting now handled by JsonResultPanel

  // copy/download are now handled via the dedicated panel if needed

  // replace handled by label-wrapped input
  const removeImage = () => {
    revokeAbort();
    setImageDataUrl(null);
    setImageInfo(null);
    resetResult();
  };
  return (
    <div ref={containerRef} className="min-h-dvh p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              ClipTagger-12b Playground
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload or paste an image, then annotate using Inference.net
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex text-xs text-muted-foreground gap-2">
              <div className="rounded-md border px-2 py-1">Max 4.5MB</div>
              <div className="rounded-md border px-2 py-1">
                JPEG · PNG · WebP · GIF
              </div>
            </div>
            <button
              onClick={() => setCodeOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent"
            >
              <Code2 className="size-4" /> Code
            </button>
          </div>
        </header>

        <section>
          <ModelIntro />
        </section>

        <section>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              "relative rounded-xl border-2 border-dashed p-6 sm:p-8 transition-colors",
              dragActive
                ? "border-primary/60 bg-muted/50"
                : "border-border bg-card/60"
            )}
          >
            {!hasImage ? (
              <EmptyUploadState
                label="Drop an image here"
                accept={`${ACCEPTED_MIME.join(",")},image/*`}
                onChange={onFileChange}
                helper="or press ⌘/Ctrl+V to paste"
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div className="rounded-lg overflow-hidden border bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageDataUrl!}
                      alt="Selected"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={annotate}
                      disabled={annotating}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground",
                        annotating
                          ? "cursor-not-allowed opacity-70"
                          : "hover:bg-primary/90"
                      )}
                    >
                      {annotating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Wand2 className="size-4" />
                      )}{" "}
                      Annotate
                    </button>
                    <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                      <RotateCcw className="size-4" />
                      <span>Replace</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={`${ACCEPTED_MIME.join(",")},image/*`}
                        onChange={onFileChange}
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                    >
                      <Trash2 className="size-4" /> Remove
                    </button>
                    {/* file input controlled by labels above */}
                    {annotating && (
                      <button
                        type="button"
                        onClick={revokeAbort}
                        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {imageInfo && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Stat
                        icon={BarChart3}
                        label="Size"
                        value={formatBytes(imageInfo.size)}
                      />
                      <Stat
                        icon={Activity}
                        label="Dimensions"
                        value={`${imageInfo.width}×${imageInfo.height}`}
                      />
                      <Stat
                        icon={BarChart3}
                        label="Type"
                        value={imageInfo.type
                          .replace("image/", "")
                          .toUpperCase()}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {error && <ErrorAlert message={error} />}

                  {apiMeta && <ApiMetaStats meta={{
                    attempts: apiMeta.attempts,
                    upstreamMs: apiMeta.upstreamMs,
                    totalMs: apiMeta.totalMs,
                    upstreamStatus: apiMeta.upstreamStatus,
                    clientMs: apiMeta.clientMs,
                  }} />}

                  {result ? (
                    <JsonResultPanel json={result} />
                  ) : (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      {annotating ? (
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />{" "}
                          Annotating…
                        </div>
                      ) : (
                        <div>Result will appear here after you annotate.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">
              Video (5-frame) Annotator
            </h2>
            <VideoAnnotator />
          </div>
        </section>

        {notice && (
          <div className="text-xs text-muted-foreground">{notice}</div>
        )}

        <footer className="text-xs text-muted-foreground">
          Pro tip: You can paste an image from your clipboard directly onto this
          page.
        </footer>

        <CodeModal open={codeOpen} onOpenChange={setCodeOpen} />
      </div>
    </div>
  );
}
