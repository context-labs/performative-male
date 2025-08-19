"use client";

import { Github } from "lucide-react";
import Link from "next/link";

export function ModelIntro() {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
      <div className="text-sm text-neutral-900 dark:text-neutral-100">
        <span className="font-medium">ClipTagger-12b</span> is a 12B-parameter
        vision-language model for scalable video understanding. It outputs
        schema-consistent JSON per frame and delivers frontier-quality at ~17x
        lower cost than frontier closed models while matching their accuracy.
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <Link
          href="https://inference.net/blog/cliptagger-12b"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border px-2 py-1 hover:bg-accent"
        >
          Blog post
        </Link>
        <Link
          href="https://docs.inference.net/use-cases/video-understanding?utm_campaign=cliptagger-12b_launch&utm_medium=web&utm_source=banner"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border px-2 py-1 hover:bg-accent"
        >
          Docs: Video understanding
        </Link>
        <Link
          href="https://huggingface.co/inference-net/ClipTagger-12b"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border px-2 py-1 hover:bg-accent"
        >
          Model card (HF)
        </Link>
        <Link
          href="https://inference.net/models/cliptagger-12b"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-md border px-2 py-1 hover:bg-accent"
        >
          Serverless API
        </Link>
        <Link
          href="https://github.com/context-labs/cliptagger-playground?tab=readme-ov-file#how-it-works"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 hover:bg-accent"
        >
          <Github className="size-3" />
          GitHub
        </Link>
      </div>
    </div>
  );
}
