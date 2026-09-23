"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { itemsOn, type CalendarItem } from "@/lib/domain/calendar";
import { formatDate, formatTime, monthGrid, type ISODate } from "@/lib/domain/dates";
import { EVENT_TYPE, TONE_CLASSES } from "@/lib/status";
import { itemClasses, itemTone, KIND_LABEL } from "./calendar-style";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Month grid. Events show as chips on their dates; deadlines and shopping/prep days show as
 * quieter lines. On phones each day shows dots and tapping a day lists its items below.
 */
export function MonthCalendar({
  month,
  today,
  items,
  prevHref,
  nextHref,
  todayHref,
  variant = "full",
  headerExtra,
}: {
  month: ISODate;
  today: ISODate;
  items: CalendarItem[];
  prevHref: string;
  nextHref: string;
  todayHref: string;
  variant?: "full" | "compact";
  headerExtra?: React.ReactNode;
}) {
  const days = monthGrid(month);
  const monthKey = month.slice(0, 7);
  const [selected, setSelected] = useState<ISODate>(today.slice(0, 7) === monthKey ? today : `${monthKey}-01`);
  const compact = variant === "compact";
  const maxChips = compact ? 2 : 4;
  const selectedItems = itemsOn(items, selected);
  const eventCount = items.filter((i) => i.kind === "event" && i.date.slice(0, 7) === monthKey).length;
  const guestCount = items.filter((i) => i.kind === "event" && i.date.slice(0, 7) === monthKey).reduce((s, i) => s + (i.guestCount ?? 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className={cn("font-display leading-none text-ink", compact ? "text-[1.6rem]" : "text-[2rem]")}>{formatDate.month(month)}</h2>
          <span className="text-[0.8125rem] text-ink-3">
            {eventCount} event{eventCount === 1 ? "" : "s"} · {guestCount} guests
          </span>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          <div className="flex items-center rounded-xl border border-line bg-linen">
            <Link href={prevHref} scroll={false} className="rounded-l-xl p-2 text-ink-3 transition-colors hover:bg-sand hover:text-ink" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link href={todayHref} scroll={false} className="border-x border-line px-3 py-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:bg-sand hover:text-ink">
              Today
            </Link>
            <Link href={nextHref} scroll={false} className="rounded-r-xl p-2 text-ink-3 transition-colors hover:bg-sand hover:text-ink" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-line">
        <div className="grid grid-cols-7 gap-px">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-sand/70 py-2 text-center text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ink-3">
              {d}
            </div>
          ))}
          {days.map((d) => {
            const inMonth = d.slice(0, 7) === monthKey;
            const isToday = d === today;
            const dayItems = itemsOn(items, d);
            const events = dayItems.filter((i) => i.kind === "event");
            const others = dayItems.filter((i) => i.kind !== "event");
            // Compact (dashboard) view: events as chips, everything else as quiet dots.
            const chipItems = compact ? events : [...events, ...others];
            const shown = chipItems.slice(0, maxChips);
            const more = chipItems.length - shown.length;
            const isSelected = d === selected;
            const past = d < today;
            return (
              <div
                key={d}
                onClick={() => setSelected(d)}
                className={cn(
                  "group relative cursor-pointer bg-linen transition-colors",
                  compact ? "min-h-[4.25rem] p-1 sm:min-h-[5.75rem] sm:p-1.5" : "min-h-[4.5rem] p-1 sm:min-h-[8rem] sm:p-2",
                  !inMonth && "bg-ivory/60",
                  isSelected && "max-sm:bg-wine-soft/60",
                  "hover:bg-white",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] tabular",
                      isToday ? "bg-wine font-semibold text-linen" : inMonth ? (past ? "text-ink-4" : "text-ink-2") : "text-ink-4/70",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {compact && others.length > 0 && (
                    <span className="hidden items-center gap-0.5 pr-0.5 sm:flex" title={others.map((o) => `${o.title}${o.subtitle ? ` — ${o.subtitle}` : ""}`).join("\n")}>
                      {others.slice(0, 3).map((o) => (
                        <span key={o.id} className={cn("h-1.5 w-1.5 rounded-full", itemClasses(o).dot)} />
                      ))}
                    </span>
                  )}
                </div>
                {/* Phone: coloured dots */}
                <div className="mt-1 flex flex-wrap gap-0.5 px-0.5 sm:hidden">
                  {dayItems.slice(0, 4).map((i) => (
                    <span key={i.id} className={cn("h-1.5 w-1.5 rounded-full", itemClasses(i).dot, i.kind !== "event" && "opacity-60")} />
                  ))}
                </div>
                {/* Tablet & desktop: chips */}
                <div className="mt-1 hidden space-y-1 sm:block">
                  {shown.map((i) => (
                    <Link
                      key={i.id}
                      href={i.href}
                      onClick={(e) => e.stopPropagation()}
                      title={`${i.title}${i.subtitle ? ` — ${i.subtitle}` : ""}`}
                      className={cn(
                        "block truncate rounded-md px-1.5 py-[3px] text-[0.6875rem] leading-tight transition-all duration-150 hover:brightness-[0.97] hover:shadow-sm",
                        i.kind === "event"
                          ? cn(itemClasses(i).pill, "font-medium", past && "opacity-60")
                          : "flex items-center gap-1 text-ink-3 hover:bg-sand",
                      )}
                    >
                      {i.kind !== "event" && <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", itemClasses(i).dot)} />}
                      {i.kind === "event" && i.time && !compact && <span className="mr-1 opacity-70 tabular">{formatTime(i.time)}</span>}
                      <span className="truncate">{i.kind === "event" ? i.title : `${i.title}${i.subtitle ? ` · ${i.subtitle}` : ""}`}</span>
                    </Link>
                  ))}
                  {more > 0 && <div className="px-1.5 text-[0.6875rem] text-ink-3">+{more} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1.5 text-[0.6875rem] text-ink-3 sm:flex">
        {["PRIVATE_DINNER", "WEDDING", "CORPORATE", "BRUNCH", "COOKING_CLASS", "VACATION_CHEF", "COCKTAIL"].map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", TONE_CLASSES[EVENT_TYPE[t].tone].dot)} />
            {EVENT_TYPE[t].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />Deadlines</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sage" />Shopping</span>
      </div>

      {/* Phone: selected day agenda */}
      <div className="mt-4 sm:hidden">
        <div className="eyebrow mb-2">{formatDate.long(selected)}</div>
        {selectedItems.length === 0 ? (
          <p className="rounded-xl bg-sand/60 px-4 py-3 text-sm text-ink-3">Nothing scheduled.</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((i) => <AgendaRow key={i.id} item={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgendaRow({ item }: { item: CalendarItem }) {
  const tone = itemTone(item);
  const cls = TONE_CLASSES[tone];
  return (
    <Link href={item.href} className="group flex items-center gap-3 rounded-xl border border-line bg-linen px-3.5 py-3 transition-all hover:border-line-strong hover:shadow-[var(--shadow-card)]">
      <span className={cn("h-9 w-1 shrink-0 rounded-full", cls.bar)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-medium text-ink">{item.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-3">
          {item.kind === "event" ? (
            <>
              <span>{EVENT_TYPE[item.eventType ?? "OTHER"]?.label}</span>
              {item.time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(item.time)}</span>}
              {item.guestCount ? <span className="flex items-center gap-1"><Users className="h-3 w-3" />{item.guestCount}</span> : null}
            </>
          ) : (
            <span>{KIND_LABEL[item.kind]}{item.subtitle ? ` · ${item.subtitle}` : ""}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-ink-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
