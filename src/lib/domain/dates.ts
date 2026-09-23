/**
 * Date helpers. The domain layer works with calendar dates as "YYYY-MM-DD" strings so that a
 * dinner on October 3rd is October 3rd everywhere, regardless of server timezone.
 * Times of day are "HH:mm" strings in the business timezone.
 */

export type ISODate = string; // YYYY-MM-DD

/** Postgres @db.Date values arrive as JS Dates at UTC midnight. */
export function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function fromISODate(s: ISODate): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** Today's date in the business timezone. */
export function todayIn(timezone: string, now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** Current time of day "HH:mm" in the business timezone. */
export function nowTimeIn(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = fromISODate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Whole days from a to b (b − a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: ISODate, months: number): ISODate {
  const d = fromISODate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISODate(d);
}

/** 0 = Sunday */
export function weekday(date: ISODate): number {
  return fromISODate(date).getUTCDay();
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, -weekday(date));
}

/** The 6×7 grid of dates shown for a month (Sunday-first). */
export function monthGrid(monthDate: ISODate): ISODate[] {
  const first = startOfMonth(monthDate);
  const start = startOfWeek(first);
  const days: ISODate[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(start, i));
  // Drop a trailing week that is entirely in the next month.
  const month = first.slice(0, 7);
  if (days.slice(35).every((d) => d.slice(0, 7) !== month)) return days.slice(0, 35);
  return days;
}

export function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function timeFromMinutes(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Hours between two times of day; an end before the start is treated as past midnight. */
export function hoursBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = minutesOf(start);
  const e = minutesOf(end);
  if (s === null || e === null) return null;
  const diff = e > s ? e - s : e + 1440 - s;
  return diff / 60;
}

export function formatTime(time?: string | null): string {
  if (!time) return "";
  const mins = minutesOf(time);
  if (mins === null) return time;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts });

const F_LONG = fmt({ weekday: "long", month: "long", day: "numeric", year: "numeric" });
const F_MED = fmt({ weekday: "short", month: "short", day: "numeric" });
const F_SHORT = fmt({ month: "short", day: "numeric" });
const F_MONTH = fmt({ month: "long", year: "numeric" });
const F_MONTH_SHORT = fmt({ month: "short" });
const F_WEEKDAY = fmt({ weekday: "short" });
const F_WEEKDAY_LONG = fmt({ weekday: "long" });

export const formatDate = {
  long: (d: ISODate) => F_LONG.format(fromISODate(d)),
  medium: (d: ISODate) => F_MED.format(fromISODate(d)),
  short: (d: ISODate) => F_SHORT.format(fromISODate(d)),
  month: (d: ISODate) => F_MONTH.format(fromISODate(d)),
  monthShort: (d: ISODate) => F_MONTH_SHORT.format(fromISODate(d)),
  weekday: (d: ISODate) => F_WEEKDAY.format(fromISODate(d)),
  weekdayLong: (d: ISODate) => F_WEEKDAY_LONG.format(fromISODate(d)),
  day: (d: ISODate) => String(Number(d.slice(8, 10))),
};

/** "Today", "Tomorrow", "in 5 days", "3 days ago" */
export function relativeDay(date: ISODate, today: ISODate): string {
  const n = daysBetween(today, date);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n > 1 && n < 7) return `in ${n} days`;
  if (n >= 7 && n < 14) return "next week";
  if (n >= 14) return `in ${Math.round(n / 7)} weeks`;
  return `${Math.abs(n)} days ago`;
}
