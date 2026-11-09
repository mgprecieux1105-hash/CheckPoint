"use client";

import type { Granularity } from "@/lib/metrics";
import { formatDate } from "@/lib/dates";
import { cn, formatPercent } from "@/lib/utils";

// Lightweight chart pieces without Recharts, so they can be used without loading the chart bundle.

export const SERIES = {
  completed: { label: "Accomplies", color: "var(--chart-completed)" },
  missed: { label: "Manquées", color: "var(--chart-missed)" },
  pending: { label: "En attente", color: "var(--chart-pending)" },
} as const;

export type SeriesKey = keyof typeof SERIES;

export function bucketLabel(b: { start: string; end: string }, g: Granularity, long = false) {
  if (g === "month") return formatDate(b.start, long ? "MMMM yyyy" : "MMM");
  if (g === "week") return long ? `Semaine du ${formatDate(b.start, "d MMM")}` : formatDate(b.start, "d MMM");
  return formatDate(b.start, long ? "EEEE d MMMM" : "d MMM");
}

export function Legend({ items, className }: { items: { label: string; color: string }[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle-foreground", className)}>
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars: completion rate per project, coloured by the project's own colour. */
export function ProjectBars({
  rows,
}: {
  rows: { id: string; name: string; color: string; rate: number | null; completed: number; planned: number; missed: number }[];
}) {
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} aria-hidden />
              <span className="truncate font-medium">{r.name}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular">
              {r.completed}/{r.planned} · {r.missed} manquée{r.missed > 1 ? "s" : ""} ·{" "}
              <span className="font-semibold text-foreground">{formatPercent(r.rate)}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={Math.round(r.rate ?? 0)} aria-valuemin={0} aria-valuemax={100} aria-label={r.name}>
            <div className="h-full rounded-full" style={{ width: `${r.rate ?? 0}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
