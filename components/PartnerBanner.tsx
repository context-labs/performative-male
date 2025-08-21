"use client";

import Link from "next/link";
import Image from "next/image";

export function PartnerBanner() {
  return (
    <Link
      href="https://inference.net/blog/cliptagger-12b?utm_source=performative-male-ai"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Read the Grass × Inference launch blog"
      className="block"
    >
      <div className="relative overflow-hidden rounded-lg border bg-background">
        <div className="relative w-full h-12 sm:h-14 md:h-16 lg:h-20">
          <Image
            src="/grass-inference-logos.png"
            alt="Grass × Inference"
            fill
            sizes="100vw"
            quality={100}
            unoptimized={true}
            className="object-cover"
          />
        </div>
        <div className="absolute bottom-1.5 right-1.5 rounded-xs bg-black px-1.5 py-0.5 text-[9px] font-medium text-white">
          Read the blog →
        </div>
      </div>
    </Link>
  );
}
