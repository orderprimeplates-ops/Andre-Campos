import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { getCalendarItems } from "@/lib/server/calendar";
import { addDays, addMonths, formatDate, formatTime, monthGrid, startOfMonth, startOfWeek, type ISODate } from "@/lib/domain/dates";
import { itemsOn, type CalendarItem } from "@/lib/domain/calendar";
import { cn } from "@/lib/cn";
import { CALENDAR_ENTRY_TYPE, EVENT_TYPE } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { MonthCalendar, AgendaRow } from "@/components/calendar/month-calendar";
import { itemClasses, KIND_LABEL } from "@/components/calendar/calendar-style";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { createCalendarEntry } from "./actions";

export const metadata = { title: "Calendar" };

type View = "month" | "week" | "agenda";

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const { today } = await getToday();
  const view: View = sp.view === "week" || sp.view === "agenda" ? sp.view : "month";
  const anchor: ISODate = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const href = (v: View, d: ISODate) => `/calendar?view=${v}&date=${d}`;

  let from: ISODate, to: ISODate;
  if (view === "month") {
    const g = monthGrid(anchor);
    [from, to] = [g[0], g[g.length - 1]];
  } else if (view === "week") {
    from = startOfWeek(anchor);
    to = addDays(from, 6);
  } else {
    from = anchor;
    to = addDays(anchor, 59);
  }

  const [items, upcomingEvents] = await Promise.all([
    getCalendarItems(from, to, today),
    db.event.findMany({ where: { date: { gte: new Date(`${today}T00:00:00Z`) }, status: { notIn: ["CANCELLED", "COMPLETED"] } }, select: { id: true, name: true }, orderBy: { date: "asc" }, take: 40 }),
  ]);

  const step = view === "month" ? (n: number) => addMonths(anchor, n) : view === "week" ? (n: number) => addDays(anchor, 7 * n) : (n: number) => addDays(anchor, 30 * n);

  const addEntry = (
    <ActionDialog trigger={<><CalendarPlus className="h-4 w-4" />Add entry</>} title="Add to calendar" description="Tastings, pickups, personal time and other deadlines." action={createCalendarEntry}>
      <Field label="Title" name="title"><Input id="title" name="title" required placeholder="Menu tasting with the couple" /></Field>
      <FormGrid>
        <Field label="Date" name="date"><Input id="date" name="date" type="date" required defaultValue={anchor} /></Field>
        <Field label="Type" name="type">
          <Select id="type" name="type" defaultValue="OTHER">
            {Object.entries(CALENDAR_ENTRY_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Start time" name="startTime" hint="optional"><Input id="startTime" name="startTime" type="time" /></Field>
        <Field label="End time" name="endTime" hint="optional"><Input id="endTime" name="endTime" type="time" /></Field>
      </FormGrid>
      <Field label="Related event" name="eventId" hint="optional">
        <Select id="eventId" name="eventId" defaultValue="">
          <option value="">None</option>
          {upcomingEvents.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
      </Field>
      <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} /></Field>
    </ActionDialog>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Calendar"
        description="Events, deadlines, shopping and prep days — everything with a date."
        actions={
          <>
            <Segmented
              active={view}
              options={[
                { key: "month", label: "Month", href: href("month", anchor) },
                { key: "week", label: "Week", href: href("week", anchor) },
                { key: "agenda", label: "Agenda", href: href("agenda", anchor) },
              ]}
            />
            {addEntry}
          </>
        }
      />

      <Card>
        <CardBody className="pt-5 sm:pt-6">
          {view === "month" && (
            <MonthCalendar
              key={anchor.slice(0, 7)}
              month={startOfMonth(anchor)}
              today={today}
              items={items}
              prevHref={href("month", step(-1))}
              nextHref={href("month", step(1))}
              todayHref={href("month", today)}
            />
          )}
          {view === "week" && <WeekView from={from} today={today} items={items} prev={href("week", step(-1))} next={href("week", step(1))} todayHref={href("week", today)} />}
          {view === "agenda" && <AgendaView from={from} to={to} today={today} items={items} prev={href("agenda", step(-1))} next={href("agenda", step(1))} todayHref={href("agenda", today)} />}
        </CardBody>
      </Card>
    </div>
  );
}

function RangeNav({ title, prev, next, todayHref, subtitle }: { title: string; subtitle?: string; prev: string; next: string; todayHref: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-baseline gap-3">
        <h2 className="font-display text-[2rem] leading-none">{title}</h2>
        {subtitle && <span className="text-[0.8125rem] text-ink-3">{subtitle}</span>}
      </div>
      <div className="flex items-center rounded-xl border border-line bg-linen">
        <Link href={prev} scroll={false} className="rounded-l-xl p-2 text-ink-3 hover:bg-sand hover:text-ink" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Link>
        <Link href={todayHref} scroll={false} className="border-x border-line px-3 py-1.5 text-[0.8125rem] font-medium text-ink-2 hover:bg-sand">Today</Link>
        <Link href={next} scroll={false} className="rounded-r-xl p-2 text-ink-3 hover:bg-sand hover:text-ink" aria-label="Next"><ChevronRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

function WeekView({ from, today, items, prev, next, todayHref }: { from: ISODate; today: ISODate; items: CalendarItem[]; prev: string; next: string; todayHref: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const events = items.filter((i) => i.kind === "event");
  return (
    <div>
      <RangeNav
        title={`${formatDate.short(days[0])} – ${formatDate.short(days[6])}`}
        subtitle={`${events.length} event${events.length === 1 ? "" : "s"} · ${events.reduce((s, e) => s + (e.guestCount ?? 0), 0)} guests`}
        prev={prev} next={next} todayHref={todayHref}
      />
      <div className="grid gap-3 md:grid-cols-7 md:gap-px md:overflow-hidden md:rounded-2xl md:border md:border-line md:bg-line">
        {days.map((d) => {
          const dayItems = itemsOn(items, d);
          const isToday = d === today;
          return (
            <div key={d} className={cn("rounded-2xl border border-line bg-linen p-3 md:min-h-[26rem] md:rounded-none md:border-0", isToday && "md:bg-wine-soft/30")}>
              <div className="mb-3 flex items-baseline justify-between md:block">
                <div className="eyebrow">{formatDate.weekday(d)}</div>
                <div className={cn("font-display text-[1.75rem] leading-none", isToday ? "text-wine" : "text-ink")}>{formatDate.day(d)}</div>
              </div>
              <div className="space-y-2">
                {dayItems.length === 0 && <div className="text-xs text-ink-4 md:hidden">—</div>}
                {dayItems.map((i) => (
                  <Link key={i.id} href={i.href} className={cn(
                    "block rounded-xl px-2.5 py-2 text-xs transition-all hover:shadow-sm",
                    i.kind === "event" ? itemClasses(i).pill : "border border-line bg-ivory text-ink-2",
                  )}>
                    {i.time && <div className="mb-0.5 font-semibold tabular opacity-80">{formatTime(i.time)}</div>}
                    <div className="font-medium leading-snug">{i.title}</div>
                    <div className="mt-0.5 opacity-75">{i.kind === "event" ? `${EVENT_TYPE[i.eventType ?? "OTHER"]?.label} · ${i.guestCount} guests` : i.subtitle ?? KIND_LABEL[i.kind]}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({ from, to, today, items, prev, next, todayHref }: { from: ISODate; to: ISODate; today: ISODate; items: CalendarItem[]; prev: string; next: string; todayHref: string }) {
  const byDay = new Map<ISODate, CalendarItem[]>();
  for (const i of items) {
    const list = byDay.get(i.date) ?? [];
    list.push(i);
    byDay.set(i.date, list);
  }
  const days = [...byDay.keys()].sort();
  return (
    <div>
      <RangeNav title="Agenda" subtitle={`${formatDate.short(from)} – ${formatDate.short(to)}`} prev={prev} next={next} todayHref={todayHref} />
      {days.length === 0 ? (
        <p className="py-10 text-center text-ink-3">Nothing scheduled in this range.</p>
      ) : (
        <div className="divide-y divide-line">
          {days.map((d) => (
            <div key={d} className="grid gap-3 py-4 sm:grid-cols-[9rem_1fr]">
              <div>
                <div className={cn("font-display text-2xl leading-none", d === today ? "text-wine" : "text-ink")}>{formatDate.short(d)}</div>
                <div className="mt-1 text-xs text-ink-3">{formatDate.weekdayLong(d)}{d === today ? " · Today" : ""}</div>
              </div>
              <div className="space-y-2">{byDay.get(d)!.map((i) => <AgendaRow key={i.id} item={i} />)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
