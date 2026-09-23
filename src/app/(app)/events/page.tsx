import { Plus, Sparkles } from "lucide-react";
import { getToday } from "@/lib/server/settings";
import { loadEventSummaries } from "@/lib/server/events";
import { fromISODate, formatDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { EventRow } from "@/components/events/event-card";

export const metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const sp = await searchParams;
  const view = sp.view === "past" || sp.view === "all" ? sp.view : "upcoming";
  const { today } = await getToday();
  const t = fromISODate(today);
  const events = await loadEventSummaries(
    view === "upcoming" ? { date: { gte: t }, status: { not: "CANCELLED" } } : view === "past" ? { date: { lt: t } } : {},
    today,
    { date: view === "upcoming" ? "asc" : "desc" },
  );
  const byMonth = new Map<string, typeof events>();
  for (const e of events) {
    const k = e.date.slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), e]);
  }
  const total = events.filter((e) => e.status !== "CANCELLED").reduce((s, e) => s + e.priceCents, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Bookings"
        title="Events"
        description={`${events.length} event${events.length === 1 ? "" : "s"} · ${formatMoney(total)} booked`}
        actions={
          <>
            <Segmented active={view} options={[{ key: "upcoming", label: "Upcoming", href: "/events" }, { key: "past", label: "Past", href: "/events?view=past" }, { key: "all", label: "All", href: "/events?view=all" }]} />
            <ButtonLink href="/events/new" variant="primary"><Plus className="h-4 w-4" />New event</ButtonLink>
          </>
        }
      />
      {events.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No events here" action={<ButtonLink href="/events/new" variant="primary">Create an event</ButtonLink>} />
      ) : (
        <div className="space-y-6">
          {[...byMonth.entries()].map(([month, list]) => (
            <section key={month}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-display text-2xl">{formatDate.month(`${month}-01`)}</h2>
                <span className="text-xs text-ink-3">{list.length} · {formatMoney(list.reduce((s, e) => s + e.priceCents, 0))}</span>
              </div>
              <Card className="p-2">{list.map((e) => <EventRow key={e.id} e={e} today={today} />)}</Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
