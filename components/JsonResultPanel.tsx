"use client";

import React from "react";

export function JsonResultPanel({ codeRef, json, header }: { codeRef?: React.RefObject<HTMLElement>; json: unknown; header?: string }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="text-sm font-medium">{header ?? "Result JSON"}</div>
      </div>
      <pre className="p-3 whitespace-pre-wrap break-words text-xs leading-5 bg-card">
        <code ref={codeRef as unknown as React.RefObject<HTMLElement>} className="language-json">
          {JSON.stringify(json, null, 2)}
        </code>
      </pre>
    </div>
  );
}

