"use client";

import Link from "next/link";
import Image from "next/image";

export function PartnerBanner() {
  return (
    <Link
      href="https://inference.net/blog/cliptagger-12b"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Read the Grass × Inference launch blog"
      className="group block"
    >
      <div className="relative overflow-hidden rounded-xl border">
        <div className="relative aspect-[16/3] w-full">
          <Image
            src="/grass-inference-logs.png"
            alt="Grass × Inference"
            fill
            priority
            sizes="100vw"
            quality={100}
            className="object-cover"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-transparent transition-opacity group-hover:opacity-80" />
        <div className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
          Read the blog →
        </div>
      </div>
    </Link>
  );
}
