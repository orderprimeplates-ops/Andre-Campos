import { addDays, type ISODate } from "./dates";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Understands "October 3", "Oct 3rd", "3 Oct", "10/3", "10/3/26", "2026-10-03".
 * Returns candidate dates (this year and, when it's already past, next year).
 */
export function parseLooseDate(q: string, today: ISODate): ISODate[] {
  const s = q.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/,/g, " ");
  const year = Number(today.slice(0, 4));
  let month: number | null = null;
  let day: number | null = null;
  let y: number | null = null;

  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return [fmt(Number(m[1]), Number(m[2]), Number(m[3]))].filter(Boolean) as ISODate[];

  m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s);
  if (m) {
    month = Number(m[1]);
    day = Number(m[2]);
    if (m[3]) y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  } else {
    m = /^([a-z]+)\.?\s+(\d{1,2})(?:\s+(\d{4}))?$/.exec(s) ?? null;
    const m2 = m ? null : /^(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?$/.exec(s);
    const word = m ? m[1] : m2?.[2];
    const d = m ? m[2] : m2?.[1];
    const yy = m ? m[3] : m2?.[3];
    if (!word || !d) return [];
    const idx = MONTHS.findIndex((mm) => word.startsWith(mm));
    if (idx < 0) return [];
    month = idx + 1;
    day = Number(d);
    if (yy) y = Number(yy);
  }
  if (!month || !day) return [];
  if (y) return [fmt(y, month, day)].filter(Boolean) as ISODate[];
  const thisYear = fmt(year, month, day);
  if (!thisYear) return [];
  // Include last year for recent history and next year for bookings far ahead.
  return [thisYear, fmt(year + 1, month, day), fmt(year - 1, month, day)].filter(
    (d): d is ISODate => !!d && d >= addDays(today, -400) && d <= addDays(today, 500),
  );
}

function fmt(y: number, m: number, d: number): ISODate | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const dt = new Date(`${iso}T00:00:00Z`);
  return dt.getUTCMonth() + 1 === m ? iso : null;
}
