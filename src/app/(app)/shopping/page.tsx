import Link from "next/link";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { getEventShopping } from "@/lib/server/shopping";
import { addDays, formatDate, fromISODate, relativeDay, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

export const metadata = { title: "Shopping" };

export default async function ShoppingPage() {
  const { today } = await getToday();
  const events = await db.event.findMany({
    where: { status: { in: ["BOOKED", "PLANNING", "READY", "TENTATIVE"] }, date: { gte: fromISODate(today), lte: fromISODate(addDays(today, 30)) } },
    select: { id: true, name: true, date: true, shoppingDate: true, guestCount: true },
    orderBy: { date: "asc" },
  });
  const lists = await Promise.all(events.map(async (e) => ({ e, s: await getEventShopping(e.id) })));
  const withItems = lists
    .filter(({ s }) => s.totals.items > 0)
    .sort((a, b) => toISODate(a.e.shoppingDate ?? a.e.date).localeCompare(toISODate(b.e.shoppingDate ?? b.e.date)));
  const due = withItems.filter(({ e }) => toISODate(e.shoppingDate ?? e.date) <= addDays(today, 7));
  const later = withItems.filter((x) => !due.includes(x));
  const totalEst = due.reduce((sum, { s }) => sum + Math.max(0, s.totals.estimatedCents - s.totals.actualCents), 0);

  const Row = ({ e, s }: (typeof withItems)[number]) => {
    const shopDay = toISODate(e.shoppingDate ?? e.date);
    const left = s.totals.items - s.totals.done;
    const soon = shopDay <= addDays(today, 1);
    return (
      <Link href={`/events/${e.id}/shop`} className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-sand/40 sm:flex-row sm:items-center">
        <div className="w-36 shrink-0">
          <div className={cn("font-display text-xl leading-tight", soon ? "text-wine" : "text-ink")}>{relativeDay(shopDay, today)}</div>
          <div className="text-xs text-ink-3">{formatDate.medium(shopDay)}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-ink">{e.name}</div>
          <div className="text-xs text-ink-3">Event {formatDate.short(toISODate(e.date))} · {e.guestCount} guests · {left ? `${left} of ${s.totals.items} items left` : "all bought"}{s.totals.notFound ? ` · ${s.totals.notFound} not found` : ""}</div>
          <ProgressBar value={(s.totals.done / s.totals.items) * 100} className="mt-2 max-w-xs" />
        </div>
        <div className="text-right">
          <div className="font-display text-xl tabular">{formatMoney(s.totals.estimatedCents)}</div>
          <div className="text-xs text-ink-3">{s.totals.actualCents ? `${formatMoney(s.totals.actualCents)} spent` : "estimated"}</div>
        </div>
        <ArrowRight className="hidden h-4 w-4 text-ink-4 transition-transform group-hover:translate-x-0.5 sm:block" />
      </Link>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Shopping" description={due.length ? `${due.length} list${due.length > 1 ? "s" : ""} to shop this week · about ${formatMoney(totalEst)} still to spend` : "Nothing to shop for this week."} />
      {withItems.length === 0 ? (
        <EmptyState icon={<ShoppingBasket className="h-6 w-6" />} title="No shopping lists yet">Lists build themselves once upcoming events have menus with linked recipes.</EmptyState>
      ) : (
        <div className="space-y-6">
          {due.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2 px-1 text-ink-2">This week</h2>
              <Card className="divide-y divide-line/70">{due.map((x) => <Row key={x.e.id} {...x} />)}</Card>
            </section>
          )}
          {later.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2 px-1 text-ink-2">Coming up</h2>
              <Card className="divide-y divide-line/70">{later.map((x) => <Row key={x.e.id} {...x} />)}</Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
