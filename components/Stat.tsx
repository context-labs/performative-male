"use client"

import React from "react"
import type { StatProps } from "./StatProps"

export const Stat: React.FC<StatProps> = ({ icon: Icon, label, value, unit, className = "" }) => {
  const [main, suffix] = React.useMemo(() => {
    if (unit != null) return [value ?? "—", unit]
    if (typeof value === "string") {
      const m = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*(\D+)$/)
      return m ? [m[1], m[2].trim()] : [value, ""]
    }
    return [value ?? "—", ""]
  }, [value, unit])

  return (
    <div
      className={[
        // Card
        "flex items-center gap-x-2 rounded-xl",
        "border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-950",
        "px-3 py-1.5 transition-colors",
        "hover:border-neutral-300 dark:hover:border-neutral-700",
        // subtle depth
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      ].join(" ")}
    >
      {/* Icon badge */}
      <div
        className={[
          "flex shrink-0 size-6 items-center justify-center rounded-lg",
          "bg-neutral-100/80 dark:bg-neutral-900/70",
          "ring-1 ring-inset ring-neutral-200/70 dark:ring-neutral-800",
        ].join(" ")}
        aria-hidden
      >
        <Icon className="size-3 text-neutral-600 dark:text-neutral-400" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Value row (no truncation; unit is lighter but baseline-aligned) */}
        <div className="flex flex-wrap items-baseline gap-x-1">
          <span
            className="font-semibold tracking-tight tabular-nums text-sm leading-none text-neutral-900 dark:text-neutral-50"
            title={String(main)}
          >
            {main}
          </span>
          {suffix && <span className="text-[12px] leading-none text-neutral-500 dark:text-neutral-400">{suffix}</span>}
        </div>

        {/* Label wraps naturally; never ellipsizes */}
        <div
          className="mt-0.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400 [overflow-wrap:anywhere]"
          title={label}
        >
          {label}
        </div>
      </div>
    </div>
  )
}
