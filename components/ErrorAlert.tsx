"use client";

import { AlertTriangle } from "lucide-react";

export function ErrorAlert({ message, className = "" }: { message: string; className?: string }) {
  if (!message) return null;
  return (
    <div className={["rounded-lg border bg-destructive/10 text-destructive p-3 text-sm flex items-start gap-2", className].join(" ")}> 
      <AlertTriangle className="size-4 mt-0.5" />
      <div>{message}</div>
    </div>
  );
}

