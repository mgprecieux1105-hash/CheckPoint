import { describe, expect, it } from "vitest";
import {
  averageDailyCompleted, bucketize, completionRate, dailyStats, dayLevel, delta, generateInsights, goalHealth, goalProgress,
  goalTargetReached, mostProductiveProject, mostProductiveWeekday, periodRange, previousRange, streaks, tally, type MetricTask,
} from "./index";

const t = (scheduled_date: string, status: MetricTask["status"], project_id: string | null = null): MetricTask => ({ scheduled_date, status, project_id });

describe("completion rate", () => {
  it("is completed / planned × 100", () => {
    expect(completionRate(3, 4)).toBe(75);
    expect(completionRate(1, 3)).toBe(33.3);
  });
  it("is null (not 0) when nothing is planned", () => {
    expect(completionRate(0, 0)).toBeNull();
    expect(tally([]).rate).toBeNull();
  });
  it("never counts pending tasks as completed and keeps missed tasks", () => {
    const s = tally([t("2026-11-01", "completed"), t("2026-11-01", "pending"), t("2026-11-01", "missed")]);
    expect(s).toEqual({ planned: 3, completed: 1, missed: 1, pending: 1, rate: 33.3 });
  });
});

describe("daily stats & heatmap levels", () => {
  it("returns one entry per day, including empty days", () => {
    const d = dailyStats([t("2026-11-02", "completed")], "2026-11-01", "2026-11-03");
    expect(d.map((x) => x.planned)).toEqual([0, 1, 0]);
  });
  it("classifies days", () => {
    const today = "2026-11-09";
    expect(dayLevel(tally([]), "2026-11-01", today)).toBe("none");
    expect(dayLevel(tally([t("x", "completed")]), "2026-11-01", today)).toBe("high");
    expect(dayLevel(tally([t("x", "completed"), t("x", "missed")]), "2026-11-01", today)).toBe("medium");
    expect(dayLevel(tally([t("x", "completed"), t("x", "missed"), t("x", "missed")]), "2026-11-01", today)).toBe("low");
    expect(dayLevel(tally([t("x", "missed")]), "2026-11-01", today)).toBe("missed");
    expect(dayLevel(tally([t("x", "pending")]), "2026-11-01", today)).toBe("missed");
    expect(dayLevel(tally([t("x", "pending")]), today, today)).toBe("planned");
    expect(dayLevel(tally([t("x", "pending")]), "2026-11-12", today)).toBe("planned");
  });
});

describe("streaks", () => {
  const today = "2026-11-09";
  it("counts consecutive days with at least one completed task", () => {
    const tasks = [t("2026-11-07", "completed"), t("2026-11-08", "completed"), t("2026-11-09", "completed")];
    expect(streaks(tasks, today)).toEqual({ current: 3, longest: 3, todayActive: true });
  });
  it("does not break the streak while today is still in progress", () => {
    const tasks = [t("2026-11-07", "completed"), t("2026-11-08", "completed"), t("2026-11-09", "pending")];
    expect(streaks(tasks, today).current).toBe(2);
  });
  it("breaks on a day without completion and tracks the longest run", () => {
    const tasks = [
      t("2026-10-01", "completed"), t("2026-10-02", "completed"), t("2026-10-03", "completed"), t("2026-10-04", "completed"),
      t("2026-11-06", "completed"), t("2026-11-07", "missed"), t("2026-11-08", "completed"),
    ];
    expect(streaks(tasks, today)).toEqual({ current: 1, longest: 4, todayActive: false });
  });
  it("ignores missed-only days and future days", () => {
    expect(streaks([t("2026-11-08", "missed"), t("2026-11-10", "completed")], today)).toEqual({ current: 0, longest: 0, todayActive: false });
  });
  it("handles month and year boundaries", () => {
    const tasks = [t("2025-12-31", "completed"), t("2026-01-01", "completed")];
    expect(streaks(tasks, "2026-01-01").current).toBe(2);
  });
});

describe("periods & buckets", () => {
  it("computes ranges", () => {
    expect(periodRange("7d", "2026-11-09")).toEqual({ from: "2026-11-03", to: "2026-11-09" });
    expect(periodRange("12m", "2026-11-09")).toEqual({ from: "2025-12-01", to: "2026-11-09" });
    expect(previousRange("2026-11-03", "2026-11-09")).toEqual({ from: "2026-10-27", to: "2026-11-02" });
  });
  it("buckets by week with the user's week start", () => {
    const tasks = [t("2026-11-02", "completed"), t("2026-11-08", "missed"), t("2026-11-09", "completed")];
    const weeks = bucketize(tasks, "2026-11-02", "2026-11-09", "week", 1);
    expect(weeks.map((w) => [w.key, w.planned])).toEqual([["2026-11-02", 2], ["2026-11-09", 1]]);
    const sundayWeeks = bucketize(tasks, "2026-11-02", "2026-11-09", "week", 0);
    expect(sundayWeeks.map((w) => [w.key, w.planned])).toEqual([["2026-11-01", 1], ["2026-11-08", 2]]);
  });
  it("buckets by month", () => {
    const m = bucketize([t("2026-10-31", "completed"), t("2026-11-01", "completed")], "2026-10-15", "2026-11-09", "month");
    expect(m.map((b) => b.completed)).toEqual([1, 1]);
  });
  it("computes deltas", () => {
    expect(delta(12, 10)).toEqual({ current: 12, previous: 10, diff: 2, pct: 20 });
    expect(delta(5, 0).pct).toBeNull();
  });
});

describe("breakdowns", () => {
  it("needs enough history before naming a best weekday", () => {
    expect(mostProductiveWeekday([t("2026-11-04", "completed")])).toBeNull();
  });
  it("finds the most productive weekday by rate", () => {
    const tasks: MetricTask[] = [];
    // Mondays 100 %, Tuesdays 50 %, Wednesdays 0 % — two weeks each
    for (const d of ["2026-11-02", "2026-10-26"]) tasks.push(t(d, "completed"));
    for (const d of ["2026-11-03", "2026-10-27"]) tasks.push(t(d, "completed"), t(d, "missed"));
    for (const d of ["2026-11-04", "2026-10-28"]) tasks.push(t(d, "missed"));
    expect(mostProductiveWeekday(tasks)?.weekday).toBe(1);
  });
  it("requires a minimum sample for the most productive project", () => {
    const few = [t("2026-11-01", "completed", "a")];
    expect(mostProductiveProject(few)).toBeNull();
    const many = Array.from({ length: 6 }, (_, i) => t(`2026-11-0${i + 1}`, "completed", "a"));
    expect(mostProductiveProject(many)?.id).toBe("a");
  });
  it("averages completed tasks per day with planned tasks", () => {
    expect(averageDailyCompleted([t("2026-11-01", "completed"), t("2026-11-01", "completed"), t("2026-11-02", "missed")])).toBe(1);
    expect(averageDailyCompleted([])).toBeNull();
  });
});

describe("goals", () => {
  const base = { target_value: 10, current_value: 4, status: "in_progress" as const, start_date: "2026-11-01", target_date: "2026-11-30" };
  it("uses the explicit target value", () => {
    expect(goalProgress({ ...base, progress_mode: "target" }).percent).toBe(40);
    expect(goalProgress({ ...base, progress_mode: "target", current_value: 15 }).percent).toBe(100);
  });
  it("uses milestones, never the number of tasks", () => {
    const p = goalProgress({ ...base, progress_mode: "milestones" }, [{ status: "completed" }, { status: "pending" }, { status: "pending" }, { status: "completed" }]);
    expect(p).toEqual({ value: 2, target: 4, percent: 50, hasMeasure: true });
    expect(goalProgress({ ...base, progress_mode: "milestones" }, []).hasMeasure).toBe(false);
  });
  it("never marks a goal achieved because its deadline passed", () => {
    const g = { ...base, progress_mode: "target" as const };
    expect(goalHealth(g, goalProgress(g), "2026-12-05")).toBe("overdue");
  });
  it("flags goals behind schedule", () => {
    const g = { ...base, progress_mode: "target" as const, current_value: 1 };
    expect(goalHealth(g, goalProgress(g), "2026-11-25")).toBe("at_risk");
    expect(goalHealth(g, goalProgress(g), "2026-11-02")).toBe("on_track");
  });
  it("suggests achievement only when the target is reached", () => {
    expect(goalTargetReached(goalProgress({ ...base, progress_mode: "target", current_value: 10 }))).toBe(true);
    expect(goalTargetReached(goalProgress({ ...base, progress_mode: "target" }))).toBe(false);
  });
});

describe("insights", () => {
  it("produces nothing without enough data (no fabricated trends)", () => {
    expect(generateInsights({ tasks: [t("2026-11-09", "completed")], today: "2026-11-09", weekStartsOn: 1, projectNames: {} })).toEqual([]);
  });
  it("reports the weekly completion rate from real data", () => {
    const tasks = [t("2026-11-09", "completed"), t("2026-11-09", "completed"), t("2026-11-09", "missed"), t("2026-11-09", "completed")];
    const ins = generateInsights({ tasks, today: "2026-11-09", weekStartsOn: 1, projectNames: {} });
    expect(ins.find((i) => i.id === "week-rate")?.text).toContain("75 %");
  });
  it("compares with the same period of last month only when it has data", () => {
    const tasks = [
      ...Array.from({ length: 3 }, () => t("2026-10-05", "completed")),
      ...Array.from({ length: 5 }, () => t("2026-11-05", "completed")),
    ];
    const ins = generateInsights({ tasks, today: "2026-11-09", weekStartsOn: 1, projectNames: {} });
    expect(ins.find((i) => i.id === "month-delta")?.text).toContain("2 tâches de plus");
  });
});
