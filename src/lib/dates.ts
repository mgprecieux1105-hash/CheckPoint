import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";

/** Calendar dates are always handled as `YYYY-MM-DD` strings (no time zone ambiguity). */
export type ISODate = string;

export type WeekStart = 0 | 1 | 6;

/** Returns today's calendar date in the given IANA time zone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): ISODate {
  try {
    // en-CA formats as YYYY-MM-DD
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return toISODate(now);
  }
}

export function toISODate(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

export function fromISODate(date: ISODate): Date {
  return parseISO(date);
}

export function shiftDate(date: ISODate, days: number): ISODate {
  return toISODate(addDays(parseISO(date), days));
}

export function daysBetween(from: ISODate, to: ISODate): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

/** Inclusive list of dates between `from` and `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const total = daysBetween(from, to);
  for (let i = 0; i <= total; i++) out.push(shiftDate(from, i));
  return out;
}

export function weekBounds(date: ISODate, weekStartsOn: WeekStart) {
  const d = parseISO(date);
  return {
    start: toISODate(startOfWeek(d, { weekStartsOn })),
    end: toISODate(endOfWeek(d, { weekStartsOn })),
  };
}

export function monthBounds(date: ISODate) {
  const d = parseISO(date);
  return { start: toISODate(startOfMonth(d)), end: toISODate(endOfMonth(d)) };
}

export function yearBounds(date: ISODate) {
  const y = date.slice(0, 4);
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export function formatDate(date: ISODate, pattern = "d MMM yyyy"): string {
  return format(parseISO(date), pattern, { locale: fr });
}

export function formatLongDate(date: ISODate): string {
  const s = format(parseISO(date), "EEEE d MMMM yyyy", { locale: fr });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function relativeDayLabel(date: ISODate, today: ISODate): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Aujourd'hui";
  if (diff === -1) return "Hier";
  if (diff === 1) return "Demain";
  return formatDate(date, "EEE d MMM");
}

/** Number of days until a deadline, negative if overdue. */
export function daysUntil(target: ISODate, today: ISODate): number {
  return daysBetween(today, target);
}

export function countdownLabel(target: ISODate, today: ISODate): string {
  const d = daysUntil(target, today);
  if (d === 0) return "Échéance aujourd'hui";
  if (d === 1) return "Demain";
  if (d > 1) return `${d} jours restants`;
  if (d === -1) return "Dépassé d'1 jour";
  return `Dépassé de ${-d} jours`;
}

export const WEEKDAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const WEEKDAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export function weekdayIndex(date: ISODate): number {
  return parseISO(date).getDay();
}

/** Weekday indexes ordered by the user's week start. */
export function orderedWeekdays(weekStartsOn: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7);
}
