import Link from "next/link";
import { ArrowRight, CalendarRange, CircleDollarSign, Inbox, Plus, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/server/auth";
import { getDashboard } from "@/lib/server/dashboard";
import { getCalendarItems } from "@/lib/server/calendar";
import { getSettings, getToday } from "@/lib/server/settings";
import { addMonths, formatDate, minutesOf, monthGrid, startOfMonth } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AttentionList } from "@/components/dashboard/attention-list";
import { EventCard } from "@/components/events/event-card";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { EmptyState } from "@/components/ui/misc";

export const metadata = { title: "Dashboard" };

function greeting(time: string) {
  const m = minutesOf(time) ?? 720;
  if (m < 12 * 60) return "Good morning";
  if (m < 17 * 60) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const [{ today, now }, settings, user, sp] = await Promise.all([getToday(), getSettings(), getCurrentUser(), searchParams]);
  const monthParam = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? `${sp.month}-01` : startOfMonth(today);
  const grid = monthGrid(monthParam);
  const [data, calendarItems] = await Promise.all([getDashboard(today), getCalendarItems(grid[0], grid[grid.length - 1], today)]);
  const s = data.snapshot;
  const name = settings.ownerName || user?.name || "Chef";
  const urgent = data.attention.filter((a) => a.priority === "urgent").length;
  const monthHref = (d: string) => `/?month=${d.slice(0, 7)}`;

  const summary = [
    data.thisWeek.length ? `${data.thisWeek.length} event${data.thisWeek.length > 1 ? "s" : ""} this week` : "A quiet week ahead",
    urgent ? `${urgent} thing${urgent > 1 ? "s" : ""} need${urgent > 1 ? "" : "s"} you today` : "nothing urgent",
  ].join(" · ");

  const tiles = [
    {
      label: "Upcoming revenue", value: formatMoney(s.upcomingRevenueCents), href: "/financials", icon: CircleDollarSign,
      note: `Next 30 days · ${formatMoney(s.upcomingProfitCents)} projected profit`,
    },
    {
      label: "Outstanding balances", value: formatMoney(s.outstandingCents), href: "/financials#outstanding", icon: CircleDollarSign,
      note: s.overdueCents > 0 ? `${formatMoney(s.overdueCents)} overdue` : `Across ${s.outstandingCount} event${s.outstandingCount === 1 ? "" : "s"}`,
      alert: s.overdueCents > 0,
    },
    {
      label: "Upcoming events", value: String(s.next30Count), href: "/events", icon: CalendarRange,
      note: `${s.next30Guests} guests in the next 30 days`,
    },
    {
      label: "Active leads", value: String(s.activeLeads), href: "/leads", icon: Inbox,
      note: `${formatMoney(s.pipelineCents)} in pipeline${s.newLeads ? ` · ${s.newLeads} new` : ""}`,
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-up">
          <div className="eyebrow mb-2">{formatDate.long(today)}</div>
          <h1 className="font-display text-[2.4rem] leading-[1.02] text-ink sm:text-[3.1rem]">
            {greeting(now)}, <span className="italic text-wine">{name}</span>.
          </h1>
          <p className="mt-2 text-[0.9375rem] text-ink-2">{summary}.</p>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/leads/new" variant="secondary"><Inbox className="h-4 w-4" />New lead</ButtonLink>
          <ButtonLink href="/events/new" variant="primary"><Plus className="h-4 w-4" />New event</ButtonLink>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {tiles.map((t, i) => (
          <Link
            key={t.label}
            href={t.href}
            style={{ animationDelay: `${i * 50}ms` }}
            className="group animate-fade-up rounded-[var(--radius-card)] border border-line/70 bg-linen p-4 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[0.75rem] font-medium text-ink-3 sm:text-[0.8125rem]">{t.label}</span>
              <t.icon className="h-4 w-4 text-ink-4 transition-colors group-hover:text-wine" strokeWidth={1.75} />
            </div>
            <div className="mt-2 font-display text-[1.9rem] leading-none tabular text-ink sm:text-[2.35rem]">{t.value}</div>
            <div className={`mt-2 text-[0.75rem] leading-snug ${t.alert ? "text-clay" : "text-ink-3"}`}>{t.note}</div>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-12 xl:gap-8">
        <Card className="min-w-0 xl:col-span-5">
          <CardHeader eyebrow="Today" title="Needs attention" />
          <CardBody className="pt-3">
            <AttentionList items={data.attention} />
          </CardBody>
        </Card>
        <Card className="min-w-0 xl:col-span-7">
          <CardBody className="pt-5 sm:pt-6">
            <MonthCalendar
              key={monthParam}
              variant="compact"
              month={monthParam}
              today={today}
              items={calendarItems}
              prevHref={monthHref(addMonths(monthParam, -1))}
              nextHref={monthHref(addMonths(monthParam, 1))}
              todayHref="/"
              headerExtra={
                <Link href="/calendar" className="hidden items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-wine sm:flex">
                  Full calendar <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          </CardBody>
        </Card>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="eyebrow mb-1">On the books</div>
            <h2 className="font-display text-[1.9rem] leading-none">Upcoming events</h2>
          </div>
          <Link href="/events" className="flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-wine">
            All events <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {data.upcoming.length === 0 ? (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No upcoming events" action={<ButtonLink href="/events/new" variant="primary">Create an event</ButtonLink>}>
            Book something wonderful.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.upcoming.map((e) => <EventCard key={e.id} e={e} today={today} />)}
          </div>
        )}
      </section>
    </div>
  );
}
