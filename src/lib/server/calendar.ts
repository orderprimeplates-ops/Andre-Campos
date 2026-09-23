import "server-only";
import { db } from "./db";
import { loadEventSummaries, toCalendarEvent } from "./events";
import { buildCalendar, type CalendarItem } from "@/lib/domain/calendar";
import { addDays, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";

/** Everything on the calendar between two dates (inclusive). */
export async function getCalendarItems(from: ISODate, to: ISODate, today: ISODate): Promise<CalendarItem[]> {
  // Deadlines can sit months before an event, so look well beyond the visible range.
  const [events, entries] = await Promise.all([
    loadEventSummaries({ date: { gte: fromISODate(addDays(from, -30)), lte: fromISODate(addDays(to, 150)) } }, today),
    db.calendarEntry.findMany({ where: { date: { gte: fromISODate(from), lte: fromISODate(to) } }, orderBy: { date: "asc" } }),
  ]);
  const items = buildCalendar(
    events.map(toCalendarEvent),
    entries.map((c) => ({ id: c.id, title: c.title, type: c.type, date: toISODate(c.date), startTime: c.startTime, eventId: c.eventId, notes: c.notes })),
  );
  return items.filter((i) => (i.endDate ?? i.date) >= from && i.date <= to);
}
