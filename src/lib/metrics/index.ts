/**
 * CheckPoint — centralised business calculations.
 *
 * Every number displayed in the app (overview, project dashboards, history,
 * analytics) is computed by the pure functions of this module, from raw task /
 * goal records. Never compute a statistic inline in a component.
 *
 * Rules (also documented in docs/BUSINESS_RULES.md):
 * - A task belongs to the day it was *planned for* (`scheduled_date`).
 * - Planned tasks = completed + missed + pending tasks of the period.
 * - Completion rate = completed / planned × 100. Pending never counts as completed.
 * - Streak: consecutive calendar days with at least one completed task. Today
 *   does not break a streak while it is still in progress.
 * - Goal progress comes from milestones or from an explicit target value,
 *   never from the number of linked tasks.
 */
import {
  dateRange,
  daysBetween,
  monthBounds,
  shiftDate,
  weekBounds,
  weekdayIndex,
  type ISODate,
  type WeekStart,
} from "@/lib/dates";

export type TaskStatus = "pending" | "completed" | "missed";

export interface MetricTask {
  status: TaskStatus;
  scheduled_date: ISODate;
  project_id?: string | null;
  goal_id?: string | null;
  category?: string | null;
}

export interface Tally {
  planned: number;
  completed: number;
  missed: number;
  pending: number;
  /** 0–100, or null when nothing was planned (avoid fake 0%). */
  rate: number | null;
}

export interface DayStats extends Tally {
  date: ISODate;
}

export function completionRate(completed: number, planned: number): number | null {
  if (planned <= 0) return null;
  return Math.round((completed / planned) * 1000) / 10;
}

export function tally(tasks: readonly MetricTask[]): Tally {
  let completed = 0;
  let missed = 0;
  let pending = 0;
  for (const t of tasks) {
    if (t.status === "completed") completed++;
    else if (t.status === "missed") missed++;
    else pending++;
  }
  const planned = completed + missed + pending;
  return { planned, completed, missed, pending, rate: completionRate(completed, planned) };
}

export function filterRange<T extends MetricTask>(tasks: readonly T[], from: ISODate, to: ISODate): T[] {
  return tasks.filter((t) => t.scheduled_date >= from && t.scheduled_date <= to);
}

/** One entry per calendar day of the range, including days without tasks. */
export function dailyStats(tasks: readonly MetricTask[], from: ISODate, to: ISODate): DayStats[] {
  const byDay = new Map<ISODate, MetricTask[]>();
  for (const t of tasks) {
    if (t.scheduled_date < from || t.scheduled_date > to) continue;
    const list = byDay.get(t.scheduled_date);
    if (list) list.push(t);
    else byDay.set(t.scheduled_date, [t]);
  }
  return dateRange(from, to).map((date) => ({ date, ...tally(byDay.get(date) ?? []) }));
}

export type DayLevel = "none" | "planned" | "high" | "medium" | "low" | "missed";

/**
 * Heatmap state of a day.
 * - none: no task recorded
 * - planned: future day / today with only pending tasks
 * - high ≥ 80 %, medium ≥ 50 %, low > 0 %
 * - missed: past day where tasks were planned but none completed
 */
export function dayLevel(stats: Tally, date: ISODate, today: ISODate): DayLevel {
  if (stats.planned === 0) return "none";
  if (stats.completed === 0) {
    if (date > today) return "planned";
    if (date === today) return stats.missed > 0 ? "missed" : "planned";
    return "missed";
  }
  const rate = stats.rate ?? 0;
  if (rate >= 80) return "high";
  if (rate >= 50) return "medium";
  return "low";
}

export interface Streaks {
  current: number;
  longest: number;
  /** Whether today already counts in the current streak. */
  todayActive: boolean;
}

/** A day is active when at least one task planned for it was completed. */
export function activeDays(tasks: readonly MetricTask[]): Set<ISODate> {
  const set = new Set<ISODate>();
  for (const t of tasks) if (t.status === "completed") set.add(t.scheduled_date);
  return set;
}

export function streaks(tasks: readonly MetricTask[], today: ISODate): Streaks {
  const active = activeDays(tasks);
  const todayActive = active.has(today);

  let current = 0;
  let cursor = todayActive ? today : shiftDate(today, -1);
  while (active.has(cursor)) {
    current++;
    cursor = shiftDate(cursor, -1);
  }

  const sorted = [...active].filter((d) => d <= today).sort();
  let longest = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of sorted) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  return { current, longest: Math.max(longest, current), todayActive };
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export type PeriodKey = "7d" | "30d" | "90d" | "12m";

export const PERIODS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "7d", label: "7 derniers jours", short: "7 j" },
  { key: "30d", label: "30 derniers jours", short: "30 j" },
  { key: "90d", label: "90 derniers jours", short: "90 j" },
  { key: "12m", label: "12 derniers mois", short: "12 m" },
];

export function periodRange(period: PeriodKey, today: ISODate): { from: ISODate; to: ISODate } {
  switch (period) {
    case "7d":
      return { from: shiftDate(today, -6), to: today };
    case "30d":
      return { from: shiftDate(today, -29), to: today };
    case "90d":
      return { from: shiftDate(today, -89), to: today };
    case "12m": {
      const start = monthBounds(today).start;
      const y = Number(start.slice(0, 4));
      const m = Number(start.slice(5, 7));
      // first day of the month, 11 months ago
      const d = new Date(y, m - 1 - 11, 1);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      return { from, to: today };
    }
  }
}

/** The equally long period right before the given one, for comparisons. */
export function previousRange(from: ISODate, to: ISODate): { from: ISODate; to: ISODate } {
  const len = daysBetween(from, to) + 1;
  return { from: shiftDate(from, -len), to: shiftDate(from, -1) };
}

export type Granularity = "day" | "week" | "month";

export function granularityFor(period: PeriodKey): Granularity {
  if (period === "12m") return "month";
  if (period === "90d") return "week";
  return "day";
}

export interface Bucket extends Tally {
  key: ISODate;
  start: ISODate;
  end: ISODate;
}

/** Groups tasks into day / week / month buckets covering the whole range. */
export function bucketize(
  tasks: readonly MetricTask[],
  from: ISODate,
  to: ISODate,
  granularity: Granularity,
  weekStartsOn: WeekStart = 1,
): Bucket[] {
  const keyOf = (date: ISODate): { key: ISODate; start: ISODate; end: ISODate } => {
    if (granularity === "day") return { key: date, start: date, end: date };
    if (granularity === "week") {
      const b = weekBounds(date, weekStartsOn);
      return { key: b.start, start: b.start, end: b.end };
    }
    const b = monthBounds(date);
    return { key: b.start, start: b.start, end: b.end };
  };

  const buckets = new Map<ISODate, { start: ISODate; end: ISODate; tasks: MetricTask[] }>();
  for (const d of dateRange(from, to)) {
    const k = keyOf(d);
    if (!buckets.has(k.key)) buckets.set(k.key, { start: k.start, end: k.end, tasks: [] });
  }
  for (const t of tasks) {
    if (t.scheduled_date < from || t.scheduled_date > to) continue;
    buckets.get(keyOf(t.scheduled_date).key)?.tasks.push(t);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, b]) => ({ key, start: b.start, end: b.end, ...tally(b.tasks) }));
}

// ---------------------------------------------------------------------------
// Breakdowns
// ---------------------------------------------------------------------------

export interface WeekdayStats extends Tally {
  weekday: number;
  /** distinct days of that weekday with at least one planned task */
  days: number;
}

export function weekdayStats(tasks: readonly MetricTask[]): WeekdayStats[] {
  const groups: MetricTask[][] = Array.from({ length: 7 }, () => []);
  const days: Set<ISODate>[] = Array.from({ length: 7 }, () => new Set());
  for (const t of tasks) {
    const w = weekdayIndex(t.scheduled_date);
    groups[w].push(t);
    days[w].add(t.scheduled_date);
  }
  return groups.map((g, weekday) => ({ weekday, days: days[weekday].size, ...tally(g) }));
}

/** Minimum data before we name a "most productive" weekday. */
export const MIN_WEEKDAY_SAMPLE = { daysPerWeekday: 2, weekdaysWithData: 3 };

/**
 * Most productive weekday by completion rate, then by completed count.
 * Returns null when there is not enough history to make a fair claim.
 */
export function mostProductiveWeekday(tasks: readonly MetricTask[]): WeekdayStats | null {
  const stats = weekdayStats(tasks).filter((s) => s.days >= MIN_WEEKDAY_SAMPLE.daysPerWeekday && s.rate !== null);
  if (stats.length < MIN_WEEKDAY_SAMPLE.weekdaysWithData) return null;
  return [...stats].sort((a, b) => (b.rate! - a.rate!) || b.completed - a.completed)[0];
}

export interface GroupStats extends Tally {
  id: string | null;
}

export function groupStats(
  tasks: readonly MetricTask[],
  key: (t: MetricTask) => string | null | undefined,
): GroupStats[] {
  const map = new Map<string | null, MetricTask[]>();
  for (const t of tasks) {
    const k = key(t) ?? null;
    const list = map.get(k);
    if (list) list.push(t);
    else map.set(k, [t]);
  }
  return [...map.entries()].map(([id, list]) => ({ id, ...tally(list) }));
}

export const MIN_PROJECT_SAMPLE = 5;

export function mostProductiveProject(tasks: readonly MetricTask[]): GroupStats | null {
  const stats = groupStats(tasks, (t) => t.project_id).filter(
    (s) => s.id !== null && s.planned >= MIN_PROJECT_SAMPLE,
  );
  if (stats.length === 0) return null;
  return [...stats].sort((a, b) => b.completed - a.completed || (b.rate ?? 0) - (a.rate ?? 0))[0];
}

/** Average completed tasks per day that had at least one planned task. */
export function averageDailyCompleted(tasks: readonly MetricTask[]): number | null {
  const days = new Set(tasks.map((t) => t.scheduled_date));
  if (days.size === 0) return null;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / days.size) * 10) / 10;
}

export interface Delta {
  current: number;
  previous: number;
  diff: number;
  /** percentage change, null when previous is 0 */
  pct: number | null;
}

export function delta(current: number, previous: number): Delta {
  return {
    current,
    previous,
    diff: current - previous,
    pct: previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export type GoalStatus = "not_started" | "in_progress" | "achieved" | "abandoned";

export interface MetricGoal {
  progress_mode: "target" | "milestones";
  target_value: number;
  current_value: number;
  status: GoalStatus;
  target_date: ISODate;
  start_date: ISODate;
}

export interface MetricMilestone {
  status: "pending" | "completed";
}

export interface GoalProgress {
  value: number;
  target: number;
  /** 0–100, capped */
  percent: number;
  hasMeasure: boolean;
}

export function goalProgress(goal: MetricGoal, milestones: readonly MetricMilestone[] = []): GoalProgress {
  if (goal.progress_mode === "milestones") {
    const target = milestones.length;
    const value = milestones.filter((m) => m.status === "completed").length;
    return {
      value,
      target,
      percent: target === 0 ? 0 : Math.min(100, Math.round((value / target) * 100)),
      hasMeasure: target > 0,
    };
  }
  const target = Number(goal.target_value);
  const value = Number(goal.current_value);
  return {
    value,
    target,
    percent: target <= 0 ? 0 : Math.min(100, Math.round((value / target) * 100)),
    hasMeasure: target > 0,
  };
}

export type GoalHealth = "achieved" | "abandoned" | "on_track" | "at_risk" | "overdue" | "not_started";

/**
 * Health indicator. A passed deadline makes a goal *overdue*, never achieved.
 * At risk: progress is more than 15 points behind the elapsed share of time.
 */
export function goalHealth(goal: MetricGoal, progress: GoalProgress, today: ISODate): GoalHealth {
  if (goal.status === "achieved") return "achieved";
  if (goal.status === "abandoned") return "abandoned";
  if (today > goal.target_date) return "overdue";
  if (goal.status === "not_started" && progress.percent === 0) return "not_started";
  const total = Math.max(1, daysBetween(goal.start_date, goal.target_date));
  const elapsed = Math.min(total, Math.max(0, daysBetween(goal.start_date, today)));
  const expected = (elapsed / total) * 100;
  return progress.percent + 15 < expected ? "at_risk" : "on_track";
}

/** Whether a goal's measurable progress reached its target (used to *suggest* achievement). */
export function goalTargetReached(progress: GoalProgress): boolean {
  return progress.hasMeasure && progress.value >= progress.target;
}

// ---------------------------------------------------------------------------
// Insights — only claims supported by the data
// ---------------------------------------------------------------------------

export interface Insight {
  id: string;
  tone: "positive" | "neutral" | "warning";
  text: string;
}

export interface InsightInput {
  tasks: readonly MetricTask[];
  today: ISODate;
  weekStartsOn: WeekStart;
  projectNames: Record<string, string>;
}

export const MIN_TASKS_FOR_RATE = 3;

function fmtPct(n: number) {
  return `${Math.round(n)} %`;
}

export function generateInsights({ tasks, today, weekStartsOn, projectNames }: InsightInput): Insight[] {
  const out: Insight[] = [];

  // This week completion
  const week = weekBounds(today, weekStartsOn);
  const thisWeek = tally(filterRange(tasks, week.start, today));
  if (thisWeek.planned >= MIN_TASKS_FOR_RATE && thisWeek.rate !== null) {
    out.push({
      id: "week-rate",
      tone: thisWeek.rate >= 70 ? "positive" : thisWeek.rate >= 40 ? "neutral" : "warning",
      text: `Vous avez accompli ${fmtPct(thisWeek.rate)} de vos tâches planifiées cette semaine (${thisWeek.completed}/${thisWeek.planned}).`,
    });
  }

  // Month over month completed tasks — only if the previous month has data
  const month = monthBounds(today);
  const prevMonthEnd = shiftDate(month.start, -1);
  const prevMonth = monthBounds(prevMonthEnd);
  const elapsedDays = daysBetween(month.start, today);
  const prevComparableEnd = shiftDate(prevMonth.start, Math.min(elapsedDays, daysBetween(prevMonth.start, prevMonth.end)));
  const cur = tally(filterRange(tasks, month.start, today));
  const prev = tally(filterRange(tasks, prevMonth.start, prevComparableEnd));
  if (prev.planned >= MIN_TASKS_FOR_RATE && cur.planned >= MIN_TASKS_FOR_RATE) {
    const diff = cur.completed - prev.completed;
    if (diff !== 0) {
      out.push({
        id: "month-delta",
        tone: diff > 0 ? "positive" : "warning",
        text:
          diff > 0
            ? `Vous avez accompli ${diff} tâche${diff > 1 ? "s" : ""} de plus qu'à la même période le mois dernier.`
            : `Vous avez accompli ${-diff} tâche${diff < -1 ? "s" : ""} de moins qu'à la même période le mois dernier.`,
      });
    }
  }

  // Most productive weekday (last 90 days)
  const recent = filterRange(tasks, shiftDate(today, -89), today);
  const best = mostProductiveWeekday(recent);
  if (best && best.rate !== null) {
    const names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const n = names[best.weekday];
    out.push({
      id: "best-weekday",
      tone: "neutral",
      text: `Sur les 90 derniers jours, le ${n} est votre jour le plus productif (${fmtPct(best.rate)} de réussite).`,
    });
  }

  // Project improvement: last 30 days vs previous 30 days
  const last30 = filterRange(tasks, shiftDate(today, -29), today);
  const prev30 = filterRange(tasks, shiftDate(today, -59), shiftDate(today, -30));
  const prevByProject = new Map(groupStats(prev30, (t) => t.project_id).map((g) => [g.id, g]));
  let bestImprovement: { id: string; diff: number } | null = null;
  for (const g of groupStats(last30, (t) => t.project_id)) {
    if (!g.id || g.planned < MIN_PROJECT_SAMPLE || g.rate === null) continue;
    const p = prevByProject.get(g.id);
    if (!p || p.planned < MIN_PROJECT_SAMPLE || p.rate === null) continue;
    const diff = g.rate - p.rate;
    if (Math.abs(diff) >= 5 && (!bestImprovement || Math.abs(diff) > Math.abs(bestImprovement.diff))) {
      bestImprovement = { id: g.id, diff };
    }
  }
  if (bestImprovement && projectNames[bestImprovement.id]) {
    const name = projectNames[bestImprovement.id];
    const pts = Math.round(Math.abs(bestImprovement.diff));
    out.push({
      id: "project-trend",
      tone: bestImprovement.diff > 0 ? "positive" : "warning",
      text:
        bestImprovement.diff > 0
          ? `Votre projet « ${name} » progresse de ${pts} points de réussite sur 30 jours.`
          : `Votre projet « ${name} » recule de ${pts} points de réussite sur 30 jours.`,
    });
  }

  // Streak
  const s = streaks(tasks, today);
  if (s.current >= 3) {
    out.push({
      id: "streak",
      tone: "positive",
      text:
        s.current >= s.longest && s.longest > 3
          ? `Série record : ${s.current} jours consécutifs actifs !`
          : `Vous êtes actif depuis ${s.current} jours consécutifs.`,
    });
  }

  // Missed tasks warning this week
  if (thisWeek.missed >= 3 && thisWeek.missed > thisWeek.completed) {
    out.push({
      id: "missed",
      tone: "warning",
      text: `${thisWeek.missed} tâches manquées cette semaine : pensez à planifier moins mais mieux.`,
    });
  }

  return out;
}
