import { describe, expect, it } from "vitest";
import { countdownLabel, dateRange, todayInTimeZone, weekBounds } from "./dates";

describe("dates", () => {
  it("computes today in the user's time zone", () => {
    const instant = new Date("2026-11-09T23:30:00Z");
    expect(todayInTimeZone("Europe/Paris", instant)).toBe("2026-11-10");
    expect(todayInTimeZone("America/New_York", instant)).toBe("2026-11-09");
  });
  it("handles DST transitions in ranges", () => {
    expect(dateRange("2026-10-24", "2026-10-26")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });
  it("respects the week start", () => {
    expect(weekBounds("2026-11-08", 1)).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(weekBounds("2026-11-08", 0)).toEqual({ start: "2026-11-08", end: "2026-11-14" });
  });
  it("labels countdowns", () => {
    expect(countdownLabel("2026-11-12", "2026-11-09")).toBe("3 jours restants");
    expect(countdownLabel("2026-11-07", "2026-11-09")).toBe("Dépassé de 2 jours");
  });
});
