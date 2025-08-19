"use client";

import { Upload, ImagePlus } from "lucide-react";

export function EmptyUploadState({ label, accept, onChange, helper }: { label: string; accept: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; helper?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-full size-14 grid place-items-center border">
        <ImagePlus className="size-6" />
      </div>
      <div className="space-y-1">
        <div className="text-base sm:text-lg font-medium">{label}</div>
        <div className="text-xs sm:text-sm text-muted-foreground">or</div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent cursor-pointer">
          <Upload className="size-4" />
          <span>Upload</span>
          <input type="file" accept={accept} onChange={onChange} className="sr-only" />
        </label>
        {helper && <div className="text-xs text-muted-foreground">{helper}</div>}
      </div>
    </div>
  );
}

