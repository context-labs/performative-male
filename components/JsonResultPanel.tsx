"use client";

import React, { useEffect, useMemo, useRef } from "react";
import hljs from "highlight.js";
import { ExternalLink } from "lucide-react";

export function JsonResultPanel({ json, header }: { json: unknown; header?: string }) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [json]);

  const jsonString = useMemo(() => JSON.stringify(json, null, 2), [json]);

  function toBase64Utf8(str: string) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
  }

  const raysoUrl = useMemo(() => {
    const params = new URLSearchParams({
      code: toBase64Utf8(jsonString ?? ""),
      language: "json",
      theme: "midnight",
      background: "true",
      darkMode: "true",
      padding: "32",
      title: header ? `Inference.net API - ${header}` : "Inference.net API - Result JSON",
    });
    return `https://www.ray.so/#${params.toString()}`;
  }, [jsonString, header]);

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="text-sm font-medium">{header ?? "Result JSON"}</div>
        <a
          href={raysoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ray.so
        </a>
      </div>
      <pre className="p-3 whitespace-pre-wrap break-words text-xs leading-5 bg-card">
        <code ref={codeRef} className="language-json">
          {jsonString}
        </code>
      </pre>
    </div>
  );
}

