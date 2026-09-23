/**
 * Calendar feed. Everything that appears on a calendar comes from this one function, so a
 * future Google/iCloud sync only has to export (or import) this shape.
 */

import type { ISODate } from "./dates";

export type CalendarKind =
  | "event"
  | "final-count"
  | "deposit"
  | "balance"
  | "shopping"
  | "prep"
  | "custom";

export interface CalendarItem {
  id: string;
  date: ISODate;
  endDate?: ISODate;
  kind: CalendarKind;
  title: string;
  subtitle?: string;
  time?: string | null;
  href: string;
  eventType?: string;
  status?: string;
  guestCount?: number;
}

export interface CalendarEventInput {
  id: string;
  name: string;
  clientName: string;
  eventType: string;
  status: string;
  date: ISODate;
  endDate?: ISODate | null;
  serviceTime?: string | null;
  guestCount: number;
  guestCountConfirmed: boolean;
  finalCountDueDate?: ISODate | null;
  depositDueDate?: ISODate | null;
  balanceDueDate?: ISODate | null;
  shoppingDate?: ISODate | null;
  prepStartDate?: ISODate | null;
  depositOutstandingCents: number;
  balanceCents: number;
}

export interface CalendarEntryInput {
  id: string;
  title: string;
  type: string;
  date: ISODate;
  startTime?: string | null;
  eventId?: string | null;
  notes?: string | null;
}

export function buildCalendar(
  events: CalendarEventInput[],
  entries: CalendarEntryInput[],
  opts: { includeDeadlines?: boolean } = {},
): CalendarItem[] {
  const deadlines = opts.includeDeadlines ?? true;
  const items: CalendarItem[] = [];
  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    const href = `/events/${e.id}`;
    items.push({
      id: `ev:${e.id}`, date: e.date, endDate: e.endDate ?? undefined, kind: "event", title: e.name,
      subtitle: `${e.clientName} · ${e.guestCount} guests`, time: e.serviceTime, href,
      eventType: e.eventType, status: e.status, guestCount: e.guestCount,
    });
    if (!deadlines || e.status === "COMPLETED") continue;
    if (e.finalCountDueDate && !e.guestCountConfirmed)
      items.push({ id: `fc:${e.id}`, date: e.finalCountDueDate, kind: "final-count", title: "Final count due",
        subtitle: e.name, href });
    if (e.depositDueDate && e.depositOutstandingCents > 0)
      items.push({ id: `dp:${e.id}`, date: e.depositDueDate, kind: "deposit", title: "Deposit due",
        subtitle: e.name, href: `${href}?tab=financials` });
    if (e.balanceDueDate && e.balanceCents > 0 && e.depositOutstandingCents === 0)
      items.push({ id: `bl:${e.id}`, date: e.balanceDueDate, kind: "balance", title: "Balance due",
        subtitle: e.name, href: `${href}?tab=financials` });
    if (e.shoppingDate)
      items.push({ id: `sh:${e.id}`, date: e.shoppingDate, kind: "shopping", title: "Shopping",
        subtitle: e.name, href: `/events/${e.id}/shop` });
    if (e.prepStartDate)
      items.push({ id: `pr:${e.id}`, date: e.prepStartDate, kind: "prep", title: "Prep begins",
        subtitle: e.name, href: `${href}?tab=prep` });
  }
  for (const c of entries) {
    items.push({ id: `ce:${c.id}`, date: c.date, kind: "custom", title: c.title, subtitle: c.notes ?? undefined,
      time: c.startTime, href: c.eventId ? `/events/${c.eventId}` : `/calendar?date=${c.date}` });
  }
  const order: Record<CalendarKind, number> = { event: 0, shopping: 1, prep: 2, custom: 3, "final-count": 4, deposit: 5, balance: 6 };
  return items.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || (a.time ?? "").localeCompare(b.time ?? ""));
}

/** Items that fall on a date, including multi-day events spanning it. */
export function itemsOn(items: CalendarItem[], date: ISODate): CalendarItem[] {
  return items.filter((i) => i.date === date || (i.endDate && i.date <= date && date <= i.endDate));
}
