import type { CalendarItem } from "@/lib/domain/calendar";
import { EVENT_TYPE, TONE_CLASSES, type Tone } from "@/lib/status";

/** Visual tone for a calendar item: events by type, deadlines & tasks by kind. */
export function itemTone(item: CalendarItem): Tone {
  if (item.kind === "event") return EVENT_TYPE[item.eventType ?? "OTHER"]?.tone ?? "neutral";
  if (item.kind === "shopping") return "sage";
  if (item.kind === "prep") return "slate";
  if (item.kind === "custom") return "neutral";
  return "amber"; // deadlines
}

export function itemClasses(item: CalendarItem) {
  return TONE_CLASSES[itemTone(item)];
}

export const KIND_LABEL: Record<CalendarItem["kind"], string> = {
  event: "Event",
  "final-count": "Final count due",
  deposit: "Deposit due",
  balance: "Balance due",
  shopping: "Shopping day",
  prep: "Prep day",
  custom: "Calendar entry",
};
