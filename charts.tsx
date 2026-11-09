"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { Bucket, Granularity, WeekdayStats } from "@/lib/metrics";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/dates";
import { Legend, SERIES, bucketLabel, type SeriesKey } from "./chart-parts";
import { formatPercent } from "@/lib/utils";

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
} as const;

function TooltipCard({ title, rows, footer }: { title: string; rows: { label: string; value: string; color?: string }[]; footer?: string }) {
  return (
    <div className="min-w-40 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-medium capitalize text-foreground">{title}</p>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-subtle-foreground">
              {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className="font-medium tabular text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
      {footer && <p className="mt-1.5 border-t border-border pt-1.5 text-muted-foreground">{footer}</p>}
    </div>
  );
}

/** Stacked completed / missed / pending per bucket. */
export function PerformanceChart({
  buckets,
  granularity,
  height = 260,
  series = ["completed", "missed", "pending"],
  onSelect,
}: {
  buckets: Bucket[];
  granularity: Granularity;
  height?: number;
  series?: SeriesKey[];
  onSelect?: (b: Bucket) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const data = buckets.map((b) => ({ ...b, label: bucketLabel(b, granularity) }));
  const many = data.length > 40;
  return (
    <div>
      <Legend items={series.map((s) => SERIES[s])} className="mb-3" />
      <div style={{ height }} role="img" aria-label="Graphique des tâches accomplies, manquées et en attente par période">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={many ? "12%" : "28%"}
            onMouseLeave={() => setActive(null)}
            onMouseMove={(s) => setActive(typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null)}
            onClick={(s) => {
              const i = typeof s?.activeTooltipIndex === "number" ? s.activeTooltipIndex : null;
              if (i !== null && onSelect) onSelect(buckets[i]);
            }}
            style={onSelect ? { cursor: "pointer" } : undefined}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...axisProps} allowDecimals={false} width={40} />
            <Tooltip
              cursor={{ fill: "var(--surface-hover)", radius: 6 }}
              content={(p: TooltipContentProps<ValueType, NameType>) => {
                if (!p.active || !p.payload?.length) return null;
                const b = p.payload[0].payload as Bucket;
                return (
                  <TooltipCard
                    title={bucketLabel(b, granularity, true)}
                    rows={[
                      ...series.map((s) => ({ label: SERIES[s].label, value: String(b[s]), color: SERIES[s].color })),
                      { label: "Planifiées", value: String(b.planned) },
                    ]}
                    footer={b.planned ? `Taux d'accomplissement : ${formatPercent(b.rate)}` : "Aucune tâche planifiée"}
                  />
                );
              }}
            />
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="a" fill={SERIES[s].color} stroke="var(--surface)" strokeWidth={many ? 0 : 1}
                radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} maxBarSize={36}>
                {data.map((_, idx) => (
                  <Cell key={idx} fillOpacity={active === null || active === idx ? 1 : 0.55} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Completion rate over time (only buckets with planned tasks get a value). */
export function RateChart({ buckets, granularity, height = 240 }: { buckets: Bucket[]; granularity: Granularity; height?: number }) {
  const data = buckets.map((b) => ({ ...b, label: bucketLabel(b, granularity), value: b.rate }));
  return (
    <div style={{ height }} role="img" aria-label="Évolution du taux d'accomplissement">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rate-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-completed)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--chart-completed)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
          <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} width={40} />
          <Tooltip
            cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              if (!p.active || !p.payload?.length) return null;
              const b = p.payload[0].payload as Bucket;
              return (
                <TooltipCard
                  title={bucketLabel(b, granularity, true)}
                  rows={[
                    { label: "Taux", value: formatPercent(b.rate), color: "var(--chart-completed)" },
                    { label: "Accomplies", value: `${b.completed} / ${b.planned}` },
                  ]}
                />
              );
            }}
          />
          <Area type="monotone" dataKey="value" stroke="var(--chart-completed)" strokeWidth={2} fill="url(#rate-fill)"
            connectNulls dot={data.length <= 31 ? { r: 3, strokeWidth: 2, stroke: "var(--surface)", fill: "var(--chart-completed)" } : false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Completion rate by weekday, ordered by the user's week start. */
export function WeekdayChart({ stats, order, best, height = 220 }: { stats: WeekdayStats[]; order: number[]; best?: WeekdayStats | null; height?: number }) {
  const data = order.map((w) => {
    const s = stats[w];
    return { ...s, label: WEEKDAY_SHORT[w], value: s.rate ?? 0 };
  });
  return (
    <div style={{ height }} role="img" aria-label="Taux d'accomplissement par jour de la semaine">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" {...axisProps} />
          <YAxis {...axisProps} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(v) => `${v}%`} width={40} />
          <Tooltip
            cursor={{ fill: "var(--surface-hover)", radius: 6 }}
            content={(p: TooltipContentProps<ValueType, NameType>) => {
              if (!p.active || !p.payload?.length) return null;
              const s = p.payload[0].payload as WeekdayStats;
              return (
                <TooltipCard
                  title={WEEKDAY_LABELS[s.weekday]}
                  rows={[
                    { label: "Taux", value: formatPercent(s.rate) },
                    { label: "Accomplies", value: `${s.completed} / ${s.planned}` },
                    { label: "Jours observés", value: String(s.days) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.weekday} fill={best && d.weekday === best.weekday ? "var(--chart-completed)" : "color-mix(in srgb, var(--chart-completed) 40%, var(--surface))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

