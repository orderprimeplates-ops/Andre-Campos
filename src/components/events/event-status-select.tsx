"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { EVENT_STATUS, EVENT_STATUS_ORDER, TONE_CLASSES } from "@/lib/status";
import { setEventStatus } from "@/app/(app)/events/actions/core";
import type { EventStatus } from "@/generated/prisma/enums";

export function EventStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const tone = EVENT_STATUS[status]?.tone ?? "neutral";
  return (
    <label className={cn("relative inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-2 text-xs font-medium", TONE_CLASSES[tone].pill, pending && "opacity-60")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", TONE_CLASSES[tone].dot)} />
      <select
        aria-label="Event status"
        value={status}
        disabled={pending}
        onChange={(e) => start(() => setEventStatus(id, e.target.value as EventStatus))}
        className="cursor-pointer appearance-none bg-transparent pr-3 focus:outline-none"
      >
        {EVENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{EVENT_STATUS[s].label}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-1.5 h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" /></svg>
    </label>
  );
}
