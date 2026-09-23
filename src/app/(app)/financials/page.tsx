import Link from "next/link";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { loadEventSummaries } from "@/lib/server/events";
import { actualEvent, type ExpenseInput } from "@/lib/domain/finance";
import { addDays, addMonths, formatDate, fromISODate, startOfMonth, toISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { EVENT_TYPE, PAYMENT_STATUS, metaOf } from "@/lib/status";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { MonthlyChart } from "@/components/finance/monthly-chart";

export const metadata = { title: "Financials" };

type Range = "month" | "last-month" | "quarter" | "ytd" | "12m" | "custom";

function rangeFor(r: Range, today: ISODate, from?: string, to?: string): [ISODate, ISODate, string] {
  const som = startOfMonth(today);
  switch (r) {
    case "last-month": { const s = addMonths(som, -1); return [s, addDays(som, -1), formatDate.month(s)]; }
    case "quarter": {
      const m = Number(today.slice(5, 7));
      const qs = `${today.slice(0, 4)}-${String(m - ((m - 1) % 3)).padStart(2, "0")}-01`;
      return [qs, addDays(addMonths(qs, 3), -1), "This quarter"];
    }
    case "ytd": return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`, `${today.slice(0, 4)} (full year)`];
    case "12m": return [addMonths(som, -11), addDays(addMonths(som, 1), -1), "Last 12 months"];
    case "custom": if (from && to && from <= to) return [from, to, `${formatDate.short(from)} – ${formatDate.short(to)}`]; // falls through
    default: return [som, addDays(addMonths(som, 1), -1), formatDate.month(som)];
  }
}

/** Actual results for completed events: receipts, shopping prices, staff pay, payments. */
async function actualsFor(eventIds: string[]) {
  if (!eventIds.length) return new Map<string, ReturnType<typeof actualEvent>>();
  const rows = await db.event.findMany({
    where: { id: { in: eventIds } },
    select: {
      id: true, guestCount: true, platform: true,
      payments: { select: { kind: true, amountCents: true } },
      expenses: { where: { kind: "ACTUAL" }, select: { category: true, amountCents: true } },
      shoppingStates: { select: { actualPriceCents: true } },
      shoppingExtras: { select: { actualPriceCents: true } },
      staffAssignments: { select: { rateCents: true, rateType: true, callTime: true, endTime: true, actualPayCents: true, staffMemberId: true, status: true } },
    },
  });
  return new Map(rows.map((r) => [r.id, actualEvent({
    collectedCents: r.payments.filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents, 0),
    guestCount: r.guestCount,
    actualExpenses: r.expenses as ExpenseInput[],
    shoppingActualCents: [...r.shoppingStates, ...r.shoppingExtras].reduce((s, x) => s + (x.actualPriceCents ?? 0), 0),
    assignments: r.staffAssignments,
    platform: r.platform,
  })]));
}

export default async function FinancialsPage({ searchParams }: PageProps<"/financials">) {
  const sp = await searchParams;
  const { today } = await getToday();
  const range = (["month", "last-month", "quarter", "ytd", "12m", "custom"].includes(String(sp.range)) ? sp.range : "ytd") as Range;
  const [from, to, label] = rangeFor(range, today, sp.from as string, sp.to as string);

  const chartFrom = addMonths(startOfMonth(today), -11);
  const [events, payments, chartEvents, outstandingAll] = await Promise.all([
    loadEventSummaries({ date: { gte: fromISODate(from), lte: fromISODate(to) }, status: { notIn: ["CANCELLED", "INQUIRY"] } }, today),
    db.payment.findMany({ where: { receivedOn: { gte: fromISODate(from), lte: fromISODate(to) }, kind: { not: "TIP" } }, select: { amountCents: true } }),
    loadEventSummaries({ date: { gte: fromISODate(chartFrom), lte: fromISODate(addDays(addMonths(startOfMonth(today), 6), -1)) }, status: { notIn: ["CANCELLED", "INQUIRY", "TENTATIVE"] } }, today),
    loadEventSummaries({ status: { notIn: ["CANCELLED", "INQUIRY", "TENTATIVE"] } }, today),
  ]);

  const booked = events.filter((e) => e.status !== "TENTATIVE");
  const tentative = events.filter((e) => e.status === "TENTATIVE");
  const revenue = booked.reduce((s, e) => s + e.priceCents, 0);
  const collected = payments.reduce((s, p) => s + p.amountCents, 0);
  const outstanding = booked.reduce((s, e) => s + e.payment.balanceCents, 0);
  const projProfit = booked.reduce((s, e) => s + e.projection.profitCents, 0);
  const food = booked.reduce((s, e) => s + e.foodCost.cents, 0);
  const labor = booked.reduce((s, e) => s + e.laborCents, 0);
  const completed = booked.filter((e) => e.status === "COMPLETED");
  const actuals = await actualsFor(completed.map((e) => e.id));
  const actualProfit = [...actuals.values()].reduce((s, a) => s + a.profitCents, 0);
  const actualRevenue = [...actuals.values()].reduce((s, a) => s + a.revenueCents, 0);

  const metrics: [string, string, string?][] = [
    ["Booked revenue", formatMoney(revenue), `${booked.length} events${tentative.length ? ` · +${formatMoney(tentative.reduce((s, e) => s + e.priceCents, 0))} tentative` : ""}`],
    ["Collected", formatMoney(collected), "payments received in range"],
    ["Outstanding", formatMoney(outstanding), "on events in range"],
    ["Projected profit", formatMoney(projProfit), revenue ? `${formatPct((projProfit / revenue) * 100)} margin` : undefined],
    ["Actual profit", completed.length ? formatMoney(actualProfit) : "—", completed.length ? `${completed.length} completed · ${actualRevenue ? formatPct((actualProfit / actualRevenue) * 100) : "—"} margin` : "no completed events"],
    ["Average event", booked.length ? formatMoney(Math.round(revenue / booked.length)) : "—", booked.length ? `${Math.round(booked.reduce((s, e) => s + e.guestCount, 0) / booked.length)} guests on average` : undefined],
    ["Food cost", revenue ? formatPct((food / revenue) * 100) : "—", formatMoney(food)],
    ["Labor cost", revenue ? formatPct((labor / revenue) * 100) : "—", formatMoney(labor)],
  ];

  const months = Array.from({ length: 18 }, (_, i) => addMonths(chartFrom, i));
  const chart = months.map((m) => {
    const list = chartEvents.filter((e) => e.date.slice(0, 7) === m.slice(0, 7));
    return { key: m, label: `${formatDate.monthShort(m)}${m.slice(0, 4) !== today.slice(0, 4) ? ` ’${m.slice(2, 4)}` : ""}`, events: list.length, revenueCents: list.reduce((s, e) => s + e.priceCents, 0), profitCents: list.reduce((s, e) => s + e.projection.profitCents, 0) };
  });

  const byType = Object.entries(
    booked.reduce<Record<string, { n: number; rev: number; profit: number }>>((acc, e) => {
      const r = (acc[e.eventType] ??= { n: 0, rev: 0, profit: 0 });
      r.n++; r.rev += e.priceCents; r.profit += e.projection.profitCents;
      return acc;
    }, {}),
  ).sort((a, b) => b[1].rev - a[1].rev);
  const owed = outstandingAll.filter((e) => e.payment.balanceCents > 0).sort((a, b) => (a.balanceDueDate ?? a.date).localeCompare(b.balanceDueDate ?? b.date));
  const lowMargin = booked.filter((e) => e.projection.marginStatus === "below-minimum" || e.projection.marginStatus === "below-target");
  const href = (r: Range) => `/financials?range=${r}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business"
        title="Financials"
        description={`${label} · operational numbers from your events — not a replacement for your accountant.`}
        actions={
          <Segmented active={range} options={[
            { key: "month", label: "Month", href: href("month") }, { key: "last-month", label: "Last month", href: href("last-month") },
            { key: "quarter", label: "Quarter", href: href("quarter") }, { key: "ytd", label: "Year", href: href("ytd") }, { key: "12m", label: "12 mo", href: href("12m") },
          ]} />
        }
      >
        <form className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={from} className="h-9 rounded-lg border border-line-strong/60 bg-white/70 px-2" aria-label="From" />
          <span className="text-ink-3">to</span>
          <input type="date" name="to" defaultValue={to} className="h-9 rounded-lg border border-line-strong/60 bg-white/70 px-2" aria-label="To" />
          <button type="submit" className="h-9 rounded-lg bg-sand px-3 font-medium text-ink-2 hover:bg-parchment">Apply</button>
        </form>
      </PageHeader>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(([k, v, note]) => (
          <Card key={k} className="p-4 sm:p-5">
            <div className="text-[0.8125rem] text-ink-3">{k}</div>
            <div className="mt-1.5 font-display text-[1.9rem] leading-none tabular sm:text-[2.2rem]">{v}</div>
            {note && <div className="mt-1.5 text-xs text-ink-3">{note}</div>}
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader eyebrow="Trend" title="Revenue & projected profit by month" description="Last 12 months and the next 6, booked events only." />
        <CardBody><MonthlyChart data={chart} /></CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="outstanding">
          <CardHeader title="Outstanding balances" description={`${formatMoney(owed.reduce((s, e) => s + e.payment.balanceCents, 0))} across ${owed.length} events (all dates)`} />
          <CardBody>
            <ul className="divide-y divide-line/70">
              {owed.map((e) => {
                const due = e.payment.depositOutstandingCents > 0 ? e.depositDueDate : e.balanceDueDate ?? e.date;
                const late = !!due && due < today;
                const st = metaOf(PAYMENT_STATUS, e.payment.status);
                return (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}?tab=financials`} className="flex items-center gap-3 py-3 hover:text-wine">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{e.name}</div>
                        <div className={cn("text-xs", late ? "text-clay" : "text-ink-3")}>{due ? `${late ? "was due" : "due"} ${formatDate.medium(due)}` : ""} · {e.client.name}</div>
                      </div>
                      <Badge tone={st.tone} size="xs">{st.label}</Badge>
                      <span className="w-20 text-right tabular">{formatMoney(e.payment.balanceCents)}</span>
                    </Link>
                  </li>
                );
              })}
              {owed.length === 0 && <li className="py-6 text-center text-sm text-ink-3">Everyone’s paid up.</li>}
            </ul>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="By event type" />
            <CardBody>
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-3"><tr className="border-b border-line"><th className="py-2 text-left font-medium">Type</th><th className="py-2 text-right font-medium">Events</th><th className="py-2 text-right font-medium">Revenue</th><th className="py-2 text-right font-medium">Margin</th></tr></thead>
                <tbody className="divide-y divide-line/60">
                  {byType.map(([t, v]) => (
                    <tr key={t}><td className="py-2.5">{EVENT_TYPE[t]?.label}</td><td className="py-2.5 text-right tabular">{v.n}</td><td className="py-2.5 text-right tabular">{formatMoney(v.rev)}</td><td className="py-2.5 text-right tabular">{v.rev ? formatPct((v.profit / v.rev) * 100) : "—"}</td></tr>
                  ))}
                  {byType.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-ink-3">No events in this range.</td></tr>}
                </tbody>
              </table>
            </CardBody>
          </Card>
          {lowMargin.length > 0 && (
            <Card>
              <CardHeader title="Under your margin target" />
              <CardBody>
                <ul className="divide-y divide-line/70 text-sm">
                  {lowMargin.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-2.5">
                      <Link href={`/events/${e.id}?tab=financials`} className="hover:text-wine">{e.name}</Link>
                      <span className={cn("tabular", e.projection.marginStatus === "below-minimum" ? "text-clay" : "text-amber")}>{formatPct(e.projection.marginPct)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
      <p className="text-xs text-ink-4">Profit here is before your own time as chef-owner. Revenue excludes tips. Events dated {toISODate(fromISODate(from))} to {to}.</p>
    </div>
  );
}
