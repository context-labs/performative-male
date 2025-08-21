"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExpandableImageProps = {
  src: string;
  alt?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
};

export function ExpandableImage({ src, alt, className, loading, fetchPriority }: ExpandableImageProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "Preview"}
          loading={loading ?? "lazy"}
          fetchPriority={fetchPriority}
          decoding="async"
          className={cn("cursor-zoom-in", className)}
        />
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl p-0" showCloseButton>
        <DialogTitle className="sr-only">{alt ?? "Image preview"}</DialogTitle>
        <div className="relative max-h-[85vh] max-w-[90vw]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? "Preview expanded"}
            loading="lazy"
            decoding="async"
            className="h-full w-full max-h-[85vh] object-contain bg-black/5"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

