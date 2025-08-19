"use client";

import React, { useEffect, useRef } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";

export function JsonResultPanel({ json, header }: { json: unknown; header?: string }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [json]);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="text-sm font-medium">{header ?? "Result JSON"}</div>
      </div>
      <pre className="p-3 whitespace-pre-wrap break-words text-xs leading-5 bg-card">
        <code ref={codeRef} className="language-json">
          {JSON.stringify(json, null, 2)}
        </code>
      </pre>
    </div>
  );
}

