"use client";

import { Timer, BarChart3, Activity } from "lucide-react";
import { Stat } from "@/components/Stat";

export type ApiMeta = {
  attempts: number;
  upstreamMs: number;
  totalMs: number;
  upstreamStatus: number | null;
  clientMs?: number;
};

export function ApiMetaStats({ meta }: { meta: ApiMeta }) {
  if (!meta) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {typeof meta.upstreamMs === "number" && (
        <Stat icon={Timer} label="Upstream" value={`${meta.upstreamMs} ms`} />
      )}
      {typeof meta.totalMs === "number" && (
        <Stat icon={Timer} label="Server total" value={`${meta.totalMs} ms`} />
      )}
      {typeof meta.clientMs === "number" && (
        <Stat icon={Timer} label="Client" value={`${meta.clientMs} ms`} />
      )}
      <Stat icon={Activity} label="Attempts" value={meta.attempts} />
      <Stat icon={BarChart3} label="Upstream status" value={meta.upstreamStatus ?? "-"} />
    </div>
  );
}

