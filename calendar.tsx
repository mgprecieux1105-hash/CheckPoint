"use client";

import { useMemo } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { dateRange, formatDate, monthBounds, orderedWeekdays, shiftDate, weekBounds, WEEKDAY_SHORT, type ISODate, type WeekStart } from "@/lib/dates";
import { dayLevel, type DayLevel, type DayStats, type Tally } from "@/lib/metrics";
import { cn, formatPercent } from "@/lib/utils";

export const LEVELS: { level: DayLevel; label: string; className: string }[] = [
  { level: "high", label: "≥ 80 %", className: "bg-heat-3 text-white" },
  { level: "medium", label: "50–79 %", className: "bg-heat-2 text-white" },
  { level: "low", label: "< 50 %", className: "bg-heat-1 text-foreground" },
  { level: "missed", label: "Tâches manquées", className: "bg-danger-soft text-danger ring-1 ring-inset ring-danger/40" },
  { level: "none", label: "Aucune activité", className: "bg-heat-0 text-muted-foreground" },
];
const LEVEL_CLASS = Object.fromEntries(LEVELS.map((l) => [l.level, l.className])) as Record<DayLevel, string>;
LEVEL_CLASS.planned = "bg-surface text-subtle-foreground ring-1 ring-inset ring-dashed ring-border-strong";

export function levelClass(level: DayLevel) {
  return LEVEL_CLASS[level];
}

export function HeatLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-muted-foreground", className)}>
      {LEVELS.map((l) => (
        <li key={l.level} className="inline-flex items-center gap-1.5">
          <span className={cn("size-3 rounded-[4px]", l.className)} aria-hidden />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

export type StatsByDate = Map<ISODate, Tally>;

const EMPTY: Tally = { planned: 0, completed: 0, missed: 0, pending: 0, rate: null };

function dayTooltip(date: ISODate, s: Tally) {
  return (
    <div>
      <p className="font-medium capitalize">{formatDate(date, "EEEE d MMMM yyyy")}</p>
      {s.planned === 0 ? (
        <p className="opacity-80">Aucune tâche enregistrée</p>
      ) : (
        <p className="opacity-80">
          {s.completed}/{s.planned} accomplies · {s.missed} manquée{s.missed > 1 ? "s" : ""} · {formatPercent(s.rate)}
        </p>
      )}
    </div>
  );
}

/** Month grid. Compact mode is used on the overview. */
export function MonthCalendar({
  month,
  stats,
  today,
  weekStartsOn,
  selected,
  onSelect,
  compact,
}: {
  month: ISODate;
  stats: StatsByDate;
  today: ISODate;
  weekStartsOn: WeekStart;
  selected?: ISODate | null;
  onSelect: (date: ISODate) => void;
  compact?: boolean;
}) {
  const days = useMemo(() => {
    const m = monthBounds(month);
    const start = weekBounds(m.start, weekStartsOn).start;
    const end = weekBounds(m.end, weekStartsOn).end;
    return { list: dateRange(start, end), monthStart: m.start, monthEnd: m.end };
  }, [month, weekStartsOn]);

  return (
    <div role="grid" aria-label={`Calendrier ${formatDate(month, "MMMM yyyy")}`}>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5" role="row">
        {orderedWeekdays(weekStartsOn).map((w) => (
          <div key={w} role="columnheader" className="text-center text-[11px] font-medium text-muted-foreground">
            {compact ? WEEKDAY_SHORT[w].charAt(0) : WEEKDAY_SHORT[w]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.list.map((d) => {
          const inMonth = d >= days.monthStart && d <= days.monthEnd;
          const s = stats.get(d) ?? EMPTY;
          const level = dayLevel(s, d, today);
          const isToday = d === today;
          return (
            <Tooltip key={d} content={dayTooltip(d, s)}>
              <button
                type="button"
                role="gridcell"
                aria-label={`${formatDate(d, "EEEE d MMMM")}${s.planned ? `, ${s.completed} sur ${s.planned} accomplies` : ", aucune activité"}`}
                aria-selected={selected === d}
                onClick={() => onSelect(d)}
                className={cn(
                  "relative flex items-center justify-center rounded-lg font-medium tabular transition hover:scale-[1.06] hover:shadow-pop",
                  compact ? "aspect-square text-[11px]" : "aspect-square text-xs sm:aspect-[1.25] sm:text-[13px]",
                  levelClass(level),
                  !inMonth && "opacity-35",
                  selected === d && "ring-2 ring-foreground ring-offset-2 ring-offset-surface",
                  isToday && selected !== d && "ring-2 ring-primary ring-offset-1 ring-offset-surface",
                )}
              >
                {Number(d.slice(8))}
                {!compact && s.planned > 0 && (
                  <span className="absolute bottom-1 right-1.5 hidden text-[9.5px] font-normal opacity-80 sm:block">{s.completed}/{s.planned}</span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/** GitHub-style yearly heatmap: one column per week. */
export function YearHeatmap({
  year,
  stats,
  today,
  weekStartsOn,
  onSelect,
}: {
  year: number;
  stats: StatsByDate;
  today: ISODate;
  weekStartsOn: WeekStart;
  onSelect: (date: ISODate) => void;
}) {
  const weeks = useMemo(() => {
    const start = weekBounds(`${year}-01-01`, weekStartsOn).start;
    const end = weekBounds(`${year}-12-31`, weekStartsOn).end;
    const all = dateRange(start, end);
    const out: ISODate[][] = [];
    for (let i = 0; i < all.length; i += 7) out.push(all.slice(i, i + 7));
    return out;
  }, [year, weekStartsOn]);

  const order = orderedWeekdays(weekStartsOn);

  return (
    <div className="overflow-x-auto pb-2 scrollbar-thin">
      <div className="inline-flex gap-2">
        <div className="mt-5 grid grid-rows-7 gap-[3px] text-[10px] text-muted-foreground">
          {order.map((w, i) => (
            <span key={w} className="flex h-3 items-center">{i % 2 === 0 ? WEEKDAY_SHORT[w] : ""}</span>
          ))}
        </div>
        <div>
          <div className="mb-1 flex h-4 gap-[3px] text-[10px] text-muted-foreground">
            {weeks.map((w, i) => {
              const first = w.find((d) => d.slice(8) === "01" && d.startsWith(String(year)));
              return (
                <span key={i} className="w-3 overflow-visible whitespace-nowrap capitalize">{first ? formatDate(first, "MMM") : ""}</span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((w, i) => (
              <div key={i} className="grid grid-rows-7 gap-[3px]">
                {w.map((d) => {
                  const inYear = d.startsWith(String(year));
                  if (!inYear) return <span key={d} className="size-3" />;
                  const s = stats.get(d) ?? EMPTY;
                  const level = d > today && s.planned === 0 ? "none" : dayLevel(s, d, today);
                  return (
                    <Tooltip key={d} content={dayTooltip(d, s)}>
                      <button
                        type="button"
                        aria-label={formatDate(d, "d MMMM yyyy")}
                        onClick={() => onSelect(d)}
                        className={cn("size-3 rounded-[3px] transition hover:scale-125", levelClass(level), d === today && "ring-1 ring-foreground")}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function statsMap(daily: DayStats[]): StatsByDate {
  return new Map(daily.map((d) => [d.date, d] as const));
}

export function weekDates(date: ISODate, weekStartsOn: WeekStart) {
  const b = weekBounds(date, weekStartsOn);
  return dateRange(b.start, shiftDate(b.start, 6));
}
