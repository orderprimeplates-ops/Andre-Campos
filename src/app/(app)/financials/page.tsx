import Link from "next/link";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { loadEventSummaries } from "@/lib/server/events";
import { actualsFor, loadYearData } from "@/lib/server/financials";
import { averageFoodCostPct, monthlyReport, monthOf, monthsOfYear, sumReport } from "@/lib/domain/reporting";
import { addDays, addMonths, formatDate, fromISODate, startOfMonth, toISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { EVENT_TYPE, PAYMENT_STATUS, metaOf } from "@/lib/status";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { MonthlyChart } from "@/components/finance/monthly-chart";
import { YearOverview } from "@/components/finance/year-overview";

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

export default async function FinancialsPage({ searchParams }: PageProps<"/financials">) {
  const sp = await searchParams;
  const { today } = await getToday();
  const range = (["month", "last-month", "quarter", "ytd", "12m", "custom"].includes(String(sp.range)) ? sp.range : "ytd") as Range;
  const [from, to, label] = rangeFor(range, today, sp.from as string, sp.to as string);

  const chartFrom = addMonths(startOfMonth(today), -11);
  const year = today.slice(0, 4);
  const [events, payments, chartEvents, outstandingAll, yearData, historicalAll] = await Promise.all([
    loadEventSummaries({ date: { gte: fromISODate(from), lte: fromISODate(to) }, status: { notIn: ["CANCELLED", "INQUIRY"] } }, today),
    // Payments dated after today haven't posted yet, so they aren't "collected".
    db.payment.findMany({ where: { receivedOn: { gte: fromISODate(from), lte: fromISODate(to < today ? to : today) }, kind: { not: "TIP" } }, select: { amountCents: true, receivedOn: true } }),
    loadEventSummaries({ date: { gte: fromISODate(chartFrom), lte: fromISODate(addDays(addMonths(startOfMonth(today), 6), -1)) }, status: { notIn: ["CANCELLED", "INQUIRY", "TENTATIVE"] } }, today),
    loadEventSummaries({ status: { notIn: ["CANCELLED", "INQUIRY", "TENTATIVE"] } }, today),
    loadYearData(year, today),
    db.historicalRevenue.findMany({ select: { month: true, amountCents: true } }),
  ]);

  // ── Year to date: historical months + tracked payments, never both for the same month ──
  const yearRows = monthlyReport({
    months: monthsOfYear(year).filter((m) => m <= today.slice(0, 7)),
    historical: yearData.historical,
    payments: yearData.payments,
    events: yearData.events,
    historicalMarginPct: yearData.settings.historicalMarginPct,
  });
  const yearTotals = sumReport(yearRows);
  const historicalByMonth = new Map(historicalAll.map((h) => [monthOf(toISODate(h.month)), h.amountCents]));

  const booked = events.filter((e) => e.status !== "TENTATIVE");
  const tentative = events.filter((e) => e.status === "TENTATIVE");
  const revenue = booked.reduce((s, e) => s + e.priceCents, 0);
  // Collected in range: historical months count their entered total; their payments are already inside it.
  const collected =
    payments.filter((p) => !historicalByMonth.has(monthOf(toISODate(p.receivedOn)))).reduce((s, p) => s + p.amountCents, 0) +
    [...historicalByMonth].filter(([m]) => `${m}-01` >= from && `${m}-01` <= to).reduce((s, [, c]) => s + c, 0);
  const outstanding = booked.reduce((s, e) => s + e.payment.balanceCents, 0);
  const projProfit = booked.reduce((s, e) => s + e.projection.profitCents, 0);
  const food = booked.reduce((s, e) => s + e.foodCost.cents, 0);
  const labor = booked.reduce((s, e) => s + e.laborCents, 0);
  // Actual profit: events that have happened and have real costs recorded (food cost, receipts, staff pay…).
  const pastBooked = booked.filter((e) => e.date <= today);
  const pastActuals = await actualsFor(pastBooked);
  const withCosts = [...pastActuals.values()].filter((a) => a.hasActualCosts);
  const actualProfit = withCosts.reduce((s, a) => s + a.profitCents, 0);
  const actualRevenue = withCosts.reduce((s, a) => s + a.revenueCents, 0);
  const metrics: [string, string, string?][] = [
    ["Booked revenue", formatMoney(revenue), `${booked.length} events${tentative.length ? ` · +${formatMoney(tentative.reduce((s, e) => s + e.priceCents, 0))} tentative` : ""}`],
    ["Collected", formatMoney(collected), historicalByMonth.size ? "payments + historical revenue in range" : "payments received in range"],
    ["Outstanding", formatMoney(outstanding), "on events in range"],
    ["Projected profit", formatMoney(projProfit), revenue ? `${formatPct((projProfit / revenue) * 100)} margin` : undefined],
    ["Actual profit", withCosts.length ? formatMoney(actualProfit) : "—", withCosts.length ? `${withCosts.length} event${withCosts.length === 1 ? "" : "s"} with recorded costs · ${actualRevenue ? formatPct((actualProfit / actualRevenue) * 100) : "—"} margin` : "add food cost or receipts to past events"],
    ["Average event", booked.length ? formatMoney(Math.round(revenue / booked.length)) : "—", booked.length ? `${Math.round(booked.reduce((s, e) => s + e.guestCount, 0) / booked.length)} guests on average` : undefined],
    ["Food cost", revenue ? formatPct((food / revenue) * 100) : "—", formatMoney(food)],
    ["Labor cost", revenue ? formatPct((labor / revenue) * 100) : "—", formatMoney(labor)],
  ];

  const months = Array.from({ length: 18 }, (_, i) => addMonths(chartFrom, i));
  // Past events with recorded costs show actual profit; everything else shows projected profit.
  const chartActuals = await actualsFor(chartEvents.filter((e) => e.date <= today));
  const chartHistorical = monthlyReport({
    months: months.map(monthOf).filter((m) => historicalByMonth.has(m)),
    historical: [...historicalByMonth].map(([month, amountCents]) => ({ month, amountCents })),
    payments: [],
    events: chartEvents.filter((e) => e.date <= today).map((e) => {
      const a = chartActuals.get(e.id)!;
      return { date: e.date, revenueCents: a.revenueCents, profitCents: a.profitCents, hasActualCosts: a.hasActualCosts, actualFoodCents: a.actualFoodCents };
    }),
    historicalMarginPct: yearData.settings.historicalMarginPct,
  });
  const chart = months.map((m) => {
    const list = chartEvents.filter((e) => e.date.slice(0, 7) === m.slice(0, 7));
    const label = `${formatDate.monthShort(m)}${m.slice(0, 4) !== today.slice(0, 4) ? ` ’${m.slice(2, 4)}` : ""}`;
    const hist = chartHistorical.find((r) => r.month === monthOf(m));
    if (hist) return { key: m, label, events: list.length, revenueCents: hist.collectedCents, profitCents: hist.profitCents, historical: true };
    const profitCents = list.reduce((s, e) => {
      const a = chartActuals.get(e.id);
      return s + (a?.hasActualCosts ? a.profitCents : e.projection.profitCents);
    }, 0);
    return { key: m, label, events: list.length, revenueCents: list.reduce((s, e) => s + e.priceCents, 0), profitCents };
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

      <YearOverview
        year={year}
        today={today}
        rows={yearRows}
        totals={yearTotals}
        thisMonth={yearRows.find((r) => r.month === today.slice(0, 7))}
        outstandingCents={outstandingAll.reduce((s, e) => s + e.payment.balanceCents, 0)}
        outstandingEvents={outstandingAll.filter((e) => e.payment.balanceCents > 0).length}
        foodCost={averageFoodCostPct(yearData.events)}
        historicalMarginPct={yearData.settings.historicalMarginPct}
        pendingEvents={yearData.events.filter((e) => !e.hasActualCosts && !yearData.historical.some((h) => h.month === monthOf(e.date))).length}
        historicalEntries={yearData.historical}
      />

      <div className="border-t border-line pt-6">
        <div className="eyebrow mb-1">Selected range</div>
        <h2 className="font-display text-[1.6rem] leading-tight">{label}</h2>
      </div>

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
        <CardHeader eyebrow="Trend" title="Revenue & profit by month" description="Last 12 months and the next 6. Booked events, plus historical revenue for months entered before HQ." />
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
