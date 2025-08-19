"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Copy, ExternalLink } from "lucide-react";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import { getCurlCode } from "@/lib/code-snippets/curl-code";
import { getTSCode } from "@/lib/code-snippets/ts-code";
import { getPythonCode } from "@/lib/code-snippets/python-code";

type CodeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey?: string; // Optional: pass in actual API key if available
};

const DEFAULT_API_KEY = "YOUR_API_KEY_HERE"; // Placeholder for examples

// Helper to replace API key placeholder in code
function replaceApiKey(code: string, apiKey: string) {
  return code.replace(/YOUR_API_KEY_HERE|"\$\{apiKey\}"/g, apiKey);
}

export function CodeModal({ open, onOpenChange, apiKey = DEFAULT_API_KEY }: CodeModalProps) { 
  const [tab, setTab] = useState<"curl" | "ts" | "py">("ts");
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      codeRef.current?.querySelectorAll("pre code").forEach((el) => {
        hljs.highlightElement(el as HTMLElement);
      });
    });
  }, [open, tab]);

  // Reset copied state when tab changes
  useEffect(() => {
    setCopied(false);
  }, [tab]);

  // Prepare code snippets, replacing API key placeholder if needed
  const curlCode = useMemo(() => replaceApiKey(getCurlCode, apiKey), [apiKey]);
  const tsCode = useMemo(() => replaceApiKey(getTSCode, apiKey), [apiKey]);
  const pyCode = useMemo(() => replaceApiKey(getPythonCode, apiKey), [apiKey]);

  const currentCode = useMemo(() => {
    switch (tab) {
      case "curl":
        return curlCode;
      case "ts":
        return tsCode;
      case "py":
        return pyCode;
      default:
        return tsCode;
    }
  }, [tab, curlCode, tsCode, pyCode]);

  function toBase64Utf8(str: string) {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
  }

  const raysoUrl = useMemo(() => {
    const params = new URLSearchParams({
      code: toBase64Utf8(currentCode),
      language: tab === "curl" ? "bash" : tab === "ts" ? "typescript" : "python",
      theme: "midnight",
      background: "true",
      darkMode: "true",
      padding: "32",
      title: `Inference.net API - ${tab === "curl" ? "cURL" : tab === "ts" ? "TypeScript" : "Python"}`,
    });
    return `https://www.ray.so/#${params.toString()}`;
  }, [currentCode, tab]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getLanguageLabel = () => {
    switch (tab) {
      case "curl":
        return "cURL";
      case "ts":
        return "TypeScript";
      case "py":
        return "Python";
      default:
        return "";
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-full sm:w-auto max-w-[90vw] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 focus:outline-none overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
        >
          <div className="flex flex-col gap-4 md:w-[600px] p-6 h-full">
            <div className="flex items-start justify-between">
              <div>
                <Dialog.Title className="text-xl font-semibold tracking-tight select-none">
                  Inference.net API Code
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 select-none">
                  Ready-to-use code examples for the Inference.net API
                </Dialog.Description>
              </div>
              <Dialog.Close className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Close">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <Tabs.Root value={tab} onValueChange={(v) => setTab(v as "curl" | "ts" | "py")} orientation="horizontal">
              <Tabs.List className="inline-flex items-center gap-1 rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800 w-full">
                <Tabs.Trigger 
                  value="curl" 
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
                >
                  cURL
                </Tabs.Trigger>
                <Tabs.Trigger 
                  value="ts" 
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
                >
                  TypeScript
                </Tabs.Trigger>
                <Tabs.Trigger 
                  value="py" 
                  className="flex-1 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 rounded-md transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
                >
                  Python
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value={tab} className="mt-4" style={{ animationDuration: "0s" }}>
                <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {getLanguageLabel()}
                    </span>
                    {apiKey === DEFAULT_API_KEY && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Remember to replace with your actual API key and your own image. This uses a placeholder key and image.
                      </span>
                    )}
                  </div>
                  <div 
                    ref={codeRef}
                    className="overflow-auto max-h-[400px] bg-white dark:bg-zinc-950"
                  >
                    <pre className="p-4 text-sm">
                      <code className={`language-${tab === "curl" ? "bash" : tab === "ts" ? "typescript" : "python"}`}>
                        {currentCode}
                      </code>
                    </pre>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {apiKey === DEFAULT_API_KEY && "Update YOUR_API_KEY_HERE with your actual key"}
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={raysoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ray.so
                </a>
                <button 
                  onClick={copy} 
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}