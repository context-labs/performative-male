"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Timer,
  Trash2,
  Upload,
  Wand2,
  RotateCcw,
  AlertTriangle,
  Code2,
} from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { CodeModal } from "@/components/CodeModal";

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
  const codeRef = useRef<HTMLElement>(null);
  const resultCodeRef = useRef<HTMLElement>(null);

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
    const el = containerRef.current ?? window;
    const handler = (e: ClipboardEvent) => onPaste(e);
    el.addEventListener("paste", handler as unknown as EventListener);
    return () => {
      el.removeEventListener("paste", handler as unknown as EventListener);
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

  useEffect(() => {
    if (codeOpen) {
      requestAnimationFrame(() => {
        codeRef.current
          ?.querySelectorAll("pre code")
          .forEach((el) => hljs.highlightElement(el as HTMLElement));
      });
    }
  }, [codeOpen]);

  useEffect(() => {
    if (!result) return;
    requestAnimationFrame(() => {
      if (resultCodeRef.current) {
        hljs.highlightElement(resultCodeRef.current);
      }
    });
  }, [result]);

  const copyJson = async () => {
    if (!result) return;
    const text = JSON.stringify(result, null, 2);
    await navigator.clipboard.writeText(text);
    setNotice("Copied result JSON to clipboard");
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotation.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // replace handled by label-wrapped input
  const removeImage = () => {
    revokeAbort();
    setImageDataUrl(null);
    setImageInfo(null);
    resetResult();
  };

  type StatProps = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number | null | undefined;
  };
   const Stat: React.FC<StatProps> = ({ icon: Icon, label, value }) => (
    <div
      className={[
        // Container
        "group grid grid-cols-[auto,1fr] gap-x-2 rounded-lg border",
        "border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-950",
        "px-2.5 py-1.5 transition-colors",
        "hover:border-neutral-300 dark:hover:border-neutral-700",
      ].join(" ")}
      aria-label={`${label}: ${value ?? "—"}`}
    >
      <div
        className={[
          "flex size-6 items-center justify-center rounded-md",
          "bg-neutral-100 dark:bg-neutral-900",
          "transition-colors group-hover:bg-neutral-50 dark:group-hover:bg-neutral-800",
        ].join(" ")}
      >
        <Icon className="size-3.5 text-neutral-600 dark:text-neutral-400" />
      </div>
  
      {/* Value + label in a 2-col grid so label wraps under itself, not under the icon */}
      <div className="min-w-0">
        <div className="grid grid-cols-[auto,1fr] items-baseline gap-x-1.5 gap-y-0.5 text-[13px] leading-tight">
          <span className="shrink-0 font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
            {value ?? "—"}
          </span>
          <span className="[overflow-wrap:anywhere] break-words text-neutral-500 dark:text-neutral-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );

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
              <div className="rounded-md border px-2 py-1">Max 1MB</div>
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
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="rounded-full size-14 grid place-items-center border">
                  <ImagePlus className="size-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-base sm:text-lg font-medium">
                    Drop an image here
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    or
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
                    <Upload className="size-4" />
                    <span>Upload</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={`${ACCEPTED_MIME.join(",")},image/*`}
                      onChange={onFileChange}
                      className="sr-only"
                    />
                  </label>
                  <div className="text-xs text-muted-foreground">
                    or press ⌘/Ctrl+V to paste
                  </div>
                </div>
              </div>
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
                  {error && (
                    <div className="rounded-lg border bg-destructive/10 text-destructive p-3 text-sm flex items-start gap-2">
                      <AlertTriangle className="size-4 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}

                  {apiMeta && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <Stat
                        icon={Timer}
                        label="Upstream"
                        value={`${apiMeta.upstreamMs} ms`}
                      />
                      <Stat
                        icon={Timer}
                        label="Server total"
                        value={`${apiMeta.totalMs} ms`}
                      />
                      <Stat
                        icon={Timer}
                        label="Client"
                        value={`${apiMeta.clientMs} ms`}
                      />
                      <Stat
                        icon={Activity}
                        label="Attempts"
                        value={apiMeta.attempts}
                      />
                      <Stat
                        icon={BarChart3}
                        label="Upstream status"
                        value={apiMeta.upstreamStatus ?? "-"}
                      />
                    </div>
                  )}

                  {result ? (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                        <div className="text-sm font-medium">Result JSON</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={copyJson}
                            className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-accent"
                          >
                            <Copy className="size-3" /> Copy
                          </button>
                          <button
                            onClick={downloadJson}
                            className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-accent"
                          >
                            <Download className="size-3" /> Download
                          </button>
                          <button
                            onClick={() => setCodeOpen(true)}
                            className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-accent"
                          >
                            <Code2 className="size-3" /> Code
                          </button>
                        </div>
                      </div>
                      <pre className="p-3 whitespace-pre-wrap break-words text-xs leading-5 bg-card">
                        <code ref={resultCodeRef} className="language-json">
                          {JSON.stringify(result, null, 2)}
                        </code>
                      </pre>
                    </div>
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
