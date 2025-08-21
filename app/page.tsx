"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Trash2,
  Wand2,
  RotateCcw,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { ErrorAlert } from "@/components/ErrorAlert";
import { EmptyUploadState } from "@/components/EmptyUploadState";
import { PartnerBanner } from "@/components/PartnerBanner";
import { useForm } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

// NOTE: single-submit flow; annotate handled server-side

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5MB
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const [annotating, setAnnotating] = useState(false);
  const [result, setResult] = useState<ClipTaggerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Removed developer-focused code modal for a simpler experience
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);
  const [displayedScore, setDisplayedScore] = useState<number>(0);
  const [onPodium, setOnPodium] = useState<boolean | null>(null);
  const [podiumMessage, setPodiumMessage] = useState<string | null>(null);

  type FormValues = {
    socialPlatform: "twitter" | "instagram" | "tiktok" | "";
    socialHandle: string;
    leaderboardOptIn: boolean;
  };
  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      socialPlatform: "",
      socialHandle: "",
      leaderboardOptIn: true,
    },
  });

  const hasImage = Boolean(imageDataUrl);

  const resetResult = useCallback(() => {
    setResult(null);
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

        // simplified: skip measuring image details
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
      window.removeEventListener(
        "paste",
        handler as unknown as EventListener,
        true
      );
    };
  }, [onPaste]);
  // Animate the visible score when the real score arrives
  useEffect(() => {
    if (score == null || saving) {
      setDisplayedScore(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const durationMs = 900;
    const startVal = 0;
    const endVal = score;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const val = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayedScore(val);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, saving]);

  // Cap the gauge at 10; higher scores still display numerically but the visual ring is maxed
  const scorePercent =
    score != null
      ? Math.max(0, Math.min(100, (Math.min(score, 10) / 10) * 100))
      : 0;
  const gaugeColor =
    score != null && score >= 8
      ? "rgb(16 185 129)" // emerald-500
      : score != null && score >= 5
      ? "rgb(245 158 11)" // amber-500
      : "rgb(244 63 94)"; // rose-500

  const barFillClass =
    score != null && score >= 8
      ? "bg-emerald-500"
      : score != null && score >= 5
      ? "bg-amber-500"
      : "bg-rose-500";

  const scoreLabel = (s: number | null) => {
    if (s == null) return "";
    if (s >= 20) return "Mythic performativity";
    if (s > 10) return "Off the charts";
    if (s >= 9) return "Elite performativity";
    if (s >= 7) return "Very performative";
    if (s >= 4) return "Moderately performative";
    return "Low performativity";
  };

  const scoreSuffix = (s: number | null) =>
    s != null && s > 10 ? "/10+" : "/10";
  const formatScore = (s: number) => `${s}${s > 10 ? "/10+" : "/10"}`;

  // removed byte formatter for a simpler UI

  const onSubmit = async (formData: FormValues) => {
    if (!imageDataUrl || annotating) return;
    setError(null);
    setResult(null);
    setScore(null);
    setMatchedKeywords([]);
    setOnPodium(null);
    setPodiumMessage(null);
    setAnnotating(true);
    setSaving(true);
    revokeAbort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const submitResp = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          socialPlatform: formData.socialPlatform || undefined,
          socialHandle: formData.socialHandle || undefined,
          // Support new name on server by mapping to existing field
          podiumOptIn: formData.leaderboardOptIn,
        }),
        signal: controller.signal,
      });
      const submitJson = (await submitResp.json()) as
        | {
            success: true;
            id: number;
            score: number;
            matchedKeywords: string[];
            createdAt: string;
            result: ClipTaggerResult;
          }
        | { error: string };
      if (submitResp.ok && "success" in submitJson) {
        const ok = submitJson;
        setResult(ok.result);
        setScore(ok.score);
        setMatchedKeywords(ok.matchedKeywords ?? []);

        // Determine podium status and reason
        try {
          const isEligibleForLeaderboard = (
            r: ClipTaggerResult | null | undefined,
            s: number
          ) => {
            if (s < 3)
              return {
                eligible: false,
                reason: `Minimum score for the leaderboard is 3. You scored ${s}.`,
              };
            const pieces: string[] = [];
            if (r) {
              pieces.push(r.description, r.environment, r.summary);
              if (Array.isArray(r.objects)) pieces.push(...r.objects);
              if (Array.isArray(r.actions)) pieces.push(...r.actions);
              if (Array.isArray(r.logos)) pieces.push(...r.logos);
            }
            const joined = pieces.join(" ").toLowerCase();
            const hasMaleSubject =
              /\b(man|male|guy|boy|gentleman|dude|men|boys|guys|person)\b/i.test(
                joined
              );
            if (!hasMaleSubject) {
              return {
                eligible: false,
                reason: `Leaderboard is limited to entries tagged as a male subject. Your submission didn’t include a male keyword.`,
              };
            }
            return { eligible: true } as const;
          };

          const eligibility = isEligibleForLeaderboard(ok.result, ok.score);
          if (!eligibility.eligible) {
            setOnPodium(false);
            setPodiumMessage(eligibility.reason as string);
          } else {
            const lbResp = await fetch("/api/leaderboard", { method: "GET" });
            if (lbResp.ok) {
              const lb = (await lbResp.json()) as {
                success: true;
                entries: Array<{
                  id: number;
                  score: number;
                  createdAt: string;
                }>;
              };
              const mine = {
                id: ok.id,
                score: ok.score,
                createdAt: ok.createdAt,
              };
              const byId = new Map<
                number,
                { id: number; score: number; createdAt: string }
              >();
              for (const e of lb.entries) byId.set(e.id, e);
              byId.set(mine.id, mine);
              const all = Array.from(byId.values());
              all.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
                );
              });
              const myIdx = all.findIndex((e) => e.id === mine.id);
              const myRank = myIdx >= 0 ? myIdx + 1 : null;
              if (myRank != null && myRank <= 25) {
                setOnPodium(true);
                setPodiumMessage(`You made the leaderboard at #${myRank}.`);
              } else {
                const twentyFifth = all[24];
                if (twentyFifth) {
                  const diff = Math.max(0, twentyFifth.score - mine.score);
                  setOnPodium(false);
                  setPodiumMessage(
                    diff === 0
                      ? `Leaderboard is currently full at ${formatScore(
                          twentyFifth.score
                        )}. Newer entries with the same score take priority.`
                      : `You needed at least ${formatScore(
                          twentyFifth.score
                        )} to make the leaderboard. You scored ${formatScore(
                          mine.score
                        )} (${diff} point${diff === 1 ? "" : "s"} short).`
                  );
                } else {
                  // Fewer than 25 entries returned; treat as leaderboard
                  setOnPodium(true);
                  setPodiumMessage(`You made the leaderboard.`);
                }
              }
            } else {
              setPodiumMessage("Couldn’t check the leaderboard right now.");
            }
          }
        } catch {
          setPodiumMessage("Couldn’t check the leaderboard right now.");
        }
      } else {
        const err = submitJson as { error?: string };
        if (submitResp.status === 409) {
          setError(err.error || "Duplicate image");
        } else {
          setError(err.error || "Request failed");
        }
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
        setError("Submission canceled");
      } else {
        setError("Network error");
      }
    } finally {
      setAnnotating(false);
      setSaving(false);
      abortRef.current = null;
    }
  };

  // Syntax highlighting now handled by JsonResultPanel

  // copy/download are now handled via the dedicated panel if needed

  // replace handled by label-wrapped input
  const removeImage = () => {
    revokeAbort();
    setImageDataUrl(null);
    resetResult();
  };
  return (
    <div ref={containerRef} className="min-h-dvh p-6 sm:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Top partner banner (sticky, ultra-subtle, hidden on mobile) */}
        <div className="hidden md:block sticky top-0 z-30 transition bg-background border-b">
          <PartnerBanner />
        </div>
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Performative Male Detector
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the contest: upload or paste a photo, get a score out of 10,
              and climb the leaderboard.
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Powered by{" "}
              <a
                href="https://inference.net/blog/cliptagger-12b"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                ClipTagger
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex text-xs text-muted-foreground gap-2">
              <div className="rounded-md border px-2 py-1">Max 4.5MB</div>
              <div className="rounded-md border px-2 py-1">
                JPEG · PNG · WebP · GIF
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Leaderboard
            </Link>
          </div>
        </header>

        {/* Removed secondary banner to avoid duplication */}

        {/* Featured image (subtle, responsive) */}
        <div className="mb-4 rounded-lg border bg-muted/30 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/male.png"
            alt="Illustration"
            loading="lazy"
            decoding="async"
            className="block w-full max-h-40 sm:max-h-56 object-contain pointer-events-none select-none"
          />
        </div>

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
                label="Drop a photo to get your score"
                accept={`${ACCEPTED_MIME.join(",")},image/*`}
                onChange={onFileChange}
                helper="or paste a photo (⌘/Ctrl+V)"
              />
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
              >
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageDataUrl!}
                      alt="Selected photo"
                      className="w-full h-auto object-contain"
                    />
                    {/* Score overlay */}
                    {saving && (
                      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                        <Loader2 className="size-3 animate-spin" /> Submitting
                        to leaderboard…
                      </div>
                    )}
                    {!saving && score !== null && (
                      <div className="absolute inset-x-3 bottom-3 sm:left-3 sm:right-auto sm:bottom-3 inline-flex items-center gap-3 rounded-2xl bg-black/65 px-3 sm:px-4 py-2.5 text-white ring-1 ring-white/10 backdrop-blur">
                        <div className="relative h-12 w-12 shrink-0">
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(${gaugeColor} ${scorePercent}%, rgba(255,255,255,0.12) 0)`,
                            }}
                            aria-hidden
                          />
                          <div className="absolute inset-1 rounded-full bg-black/70 flex items-center justify-center">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold tabular-nums leading-none">
                                {displayedScore}
                              </span>
                              <span className="text-[10px] leading-none opacity-80">
                                {scoreSuffix(score)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold leading-tight">
                            {scoreLabel(score)}
                          </div>
                          {matchedKeywords.length > 0 && (
                            <div className="mt-1 hidden sm:flex flex-wrap gap-1.5">
                              {matchedKeywords.slice(0, 3).map((k) => (
                                <span
                                  key={k}
                                  className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium"
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Link
                          href="/leaderboard"
                          className="hidden sm:inline-flex items-center rounded-full bg-white/15 hover:bg-white/25 px-2.5 py-1 text-[11px] font-medium"
                        >
                          Leaderboard
                        </Link>
                      </div>
                    )}
                  </div>
                  {!saving && score !== null && (
                    <div className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Your performativity
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatScore(score)}
                        </div>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-[width] duration-700",
                            barFillClass
                          )}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>
                      {onPodium !== null && podiumMessage && (
                        <div
                          className={cn(
                            "mt-3 inline-flex items-start gap-2 rounded-md px-3 py-2 text-[12px]",
                            onPodium
                              ? "bg-emerald-500/10 text-emerald-800"
                              : "bg-amber-500/10 text-amber-800"
                          )}
                        >
                          {onPodium ? (
                            <Trophy className="mt-0.5 size-4" />
                          ) : (
                            <AlertCircle className="mt-0.5 size-4" />
                          )}
                          <span className="leading-snug">{podiumMessage}</span>
                        </div>
                      )}
                      {matchedKeywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {matchedKeywords.map((k) => (
                            <span
                              key={k}
                              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Inline social + opt-in controls (mobile-friendly) */}
                    <div className="inline-flex w-full sm:w-auto flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
                      <Label className="text-xs text-muted-foreground">
                        Feature Your Socials On The Leaderboard (optional)
                      </Label>
                      <div className="flex flex-1 sm:flex-none items-center gap-2 min-w-0">
                        <Select
                          value={(watch("socialPlatform") ?? "") as string}
                          onValueChange={(v) => {
                            if (v === "none") {
                              setValue("socialPlatform", "");
                            } else {
                              setValue(
                                "socialPlatform",
                                v as "twitter" | "instagram" | "tiktok"
                              );
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue placeholder="Platform" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="twitter">Twitter / X</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="tiktok">TikTok</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                        <input type="hidden" {...register("socialPlatform")} />
                        <Input
                          {...register("socialHandle")}
                          placeholder="handle (no @)"
                          className="h-8 flex-1 sm:flex-none min-w-[120px] sm:w-[180px]"
                        />
                        {/* leaderboard checkbox moved out to its own control */}
                      </div>
                    </div>
                    {/* Separate leaderboard opt-in */}
                    <div className="inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
                      <Checkbox
                        id="leaderboardOptIn"
                        checked={Boolean(watch("leaderboardOptIn"))}
                        onCheckedChange={(v) => setValue("leaderboardOptIn", Boolean(v))}
                      />
                      <Label htmlFor="leaderboardOptIn" className="m-0 text-xs sm:text-sm">
                        Opt-in to leaderboard
                      </Label>
                    </div>
                    {/* keep field registered in the form state */}
                    <input type="hidden" {...register("leaderboardOptIn")} />
                    <button
                      type="submit"
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
                      Get My Score
                    </button>

                    <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent cursor-pointer">
                      <RotateCcw className="size-4" />
                      <span>Upload new photo</span>
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
                      <Trash2 className="size-4" /> Clear photo
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

                  {/* Simplified: hide technical image details for average users */}
                </div>

                <div className="space-y-3">
                  {error && <ErrorAlert message={error} />}

                  {result ? (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div>
                        <div className="text-sm font-medium">Summary</div>
                        {result.summary && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {result.summary}
                          </p>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-medium mb-1">
                          Highlights
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[
                            ...new Set(
                              [
                                ...(result.objects || []),
                                ...(result.actions || []),
                                result.specific_style,
                                result.environment,
                                result.production_quality,
                                ...(result.logos || []),
                              ].filter(Boolean) as string[]
                            ),
                          ]
                            .slice(0, 12)
                            .map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Powered by ClipTagger
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                      {annotating ? (
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" /> Scoring…
                        </div>
                      ) : (
                        <div>
                          Your score and breakdown will appear here after you
                          click “Get My Score”.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>

        {notice && (
          <div className="text-xs text-muted-foreground">{notice}</div>
        )}

        <section className="rounded-xl border p-4 sm:p-6 space-y-3">
          <h2 className="text-lg font-semibold">Rules</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Only submit images you have the right to share. No illegal or
              harmful content.
            </li>
            <li>
              Do not upload faces of private individuals without their consent.
            </li>
            <li>Max image size is 4.5MB. Supported: JPEG, PNG, WebP, GIF.</li>
            <li>Scores are automated and for fun; they may be inaccurate.</li>
            <li>We may remove submissions that violate these rules.</li>
            <li>
              Leaderboard eligibility: entries must score at least 3/10 and
              include a male subject (detected automatically).
            </li>
            <li>
              Leaderboard shows the top 25 eligible entries. Ties are broken by newer
              submissions.
            </li>
          </ul>
        </section>

        <footer className="text-xs text-muted-foreground">
          Pro tip: Paste a photo from your clipboard to enter instantly.
        </footer>

        {/* Developer code modal removed for simplicity */}
      </div>
    </div>
  );
}
