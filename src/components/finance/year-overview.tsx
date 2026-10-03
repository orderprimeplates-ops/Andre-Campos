import { History, Info } from "lucide-react";
import { formatDate, type ISODate } from "@/lib/domain/dates";
import { centsToInput, formatMoney, formatPct } from "@/lib/domain/money";
import type { MonthRow, ProfitBasis, sumReport } from "@/lib/domain/reporting";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, Input, MoneyInput } from "@/components/ui/field";
import { saveHistoricalRevenue } from "@/app/(app)/financials/actions";
import type { Tone } from "@/lib/status";

const BASIS: Record<ProfitBasis, { label: string; tone: Tone }> = {
  actual: { label: "Actual", tone: "sage" },
  estimated: { label: "Estimated", tone: "amber" },
  mixed: { label: "Actual + est.", tone: "champagne" },
  none: { label: "—", tone: "neutral" },
};

const monthName = (m: string, style: "long" | "short" = "long") => (style === "long" ? formatDate.month(`${m}-01`) : formatDate.monthShort(`${m}-01`));

/** Enter collected revenue per month for months before HQ tracked every payment. */
export function HistoricalRevenueDialog({ year, today, entries, marginPct }: { year: string; today: ISODate; entries: { month: string; amountCents: number }[]; marginPct: number }) {
  const byMonth = new Map(entries.map((e) => [e.month, e.amountCents]));
  const thisMonth = today.slice(0, 7);
  return (
    <ActionDialog
      trigger={<><History className="h-4 w-4" />Historical revenue</>}
      triggerSize="sm"
      title={`Historical revenue · ${year}`}
      description="Money actually collected each month before you tracked every payment in HQ. Leave a month blank to use the payments recorded in HQ instead."
      action={saveHistoricalRevenue}
      hidden={{ year }}
      submitLabel="Save historical revenue"
      wide
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).map((m) => {
          const future = m > thisMonth;
          return (
            <Field key={m} label={monthName(m, "short")} name={`m-${m}`}>
              <MoneyInput id={`m-${m}`} name={`m-${m}`} disabled={future} placeholder={future ? "—" : ""} defaultValue={byMonth.has(m) ? centsToInput(byMonth.get(m)!) : ""} />
            </Field>
          );
        })}
      </div>
      <Field label="Historical profit margin %" name="historicalMarginPct" hint="used to estimate profit for these months">
        <Input id="historicalMarginPct" name="historicalMarginPct" inputMode="decimal" defaultValue={marginPct} />
      </Field>
      <p className="rounded-xl bg-sand/60 px-3.5 py-2.5 text-xs text-ink-2">
        A month entered here is the complete collected total for that month. Any payments recorded on events in that month are already inside it and are not counted again.
        Historical revenue never creates clients or events, so client counts, event counts and averages are unaffected.
      </p>
    </ActionDialog>
  );
}

type Totals = ReturnType<typeof sumReport>;

export function YearOverview({
  year, today, rows, totals, thisMonth, outstandingCents, outstandingEvents, foodCost, historicalMarginPct, pendingEvents, historicalEntries,
}: {
  year: string;
  today: ISODate;
  rows: MonthRow[];
  totals: Totals;
  thisMonth: MonthRow | undefined;
  outstandingCents: number;
  outstandingEvents: number;
  foodCost: { pct: number | null; events: number };
  historicalMarginPct: number;
  pendingEvents: number;
  historicalEntries: { month: string; amountCents: number }[];
}) {
  const ytdRows = rows.filter((r) => r.month <= today.slice(0, 7));
  const histMonths = ytdRows.filter((r) => r.source === "historical");

  const tiles: { label: string; value: string; note?: string; estimate?: boolean }[] = [
    {
      label: `${year} YTD collected revenue`,
      value: formatMoney(totals.collectedCents),
      note: totals.historicalCents ? `incl. ${formatMoney(totals.historicalCents)} historical` : "payments received",
    },
    { label: "Revenue this month", value: formatMoney(thisMonth?.collectedCents ?? 0), note: thisMonth?.source === "historical" ? "historical entry" : formatDate.month(`${today.slice(0, 7)}-01`) },
    { label: "Outstanding booked revenue", value: formatMoney(outstandingCents), note: `still to collect on ${outstandingEvents} event${outstandingEvents === 1 ? "" : "s"}` },
    { label: "Actual profit", value: formatMoney(totals.actualProfitCents), note: "events with recorded costs" },
    { label: "Estimated historical profit", value: formatMoney(totals.estimatedHistoricalProfitCents), note: `${formatPct(historicalMarginPct)} of historical revenue`, estimate: true },
    {
      label: `${year} YTD profit`,
      value: formatMoney(totals.profitCents),
      note: totals.includesEstimates ? "actual + estimated" : "all actual",
      estimate: totals.includesEstimates,
    },
    { label: "Average food cost", value: formatPct(foodCost.pct, 1), note: foodCost.events ? `across ${foodCost.events} event${foodCost.events === 1 ? "" : "s"} with actual food cost` : "add food cost to events" },
    { label: "Profit margin", value: formatPct(totals.marginPct, 1), note: totals.includesEstimates ? "includes estimates" : "actual", estimate: totals.includesEstimates },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">At a glance</div>
          <h2 className="font-display text-[1.6rem] leading-tight">{year} year to date</h2>
        </div>
        <HistoricalRevenueDialog year={year} today={today} entries={historicalEntries} marginPct={historicalMarginPct} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4 sm:p-5">
            <div className="flex items-center gap-1.5 text-[0.8125rem] text-ink-3">{t.label}{t.estimate && <Badge tone="amber" size="xs">est.</Badge>}</div>
            <div className="mt-1.5 font-display text-[1.9rem] leading-none tabular sm:text-[2.2rem]">{t.value}</div>
            {t.note && <div className="mt-1.5 text-xs text-ink-3">{t.note}</div>}
          </Card>
        ))}
      </div>

      {(totals.includesEstimates || histMonths.length > 0) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-amber/20 bg-amber-soft/50 px-4 py-3 text-sm text-ink-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <div className="space-y-1">
            {totals.includesEstimates && (
              <p>
                <span className="font-medium text-ink">YTD profit includes estimated historical profit where detailed expenses are unavailable.</span>{" "}
                {formatMoney(totals.actualProfitCents)} actual
                {totals.estimatedHistoricalProfitCents ? ` + ${formatMoney(totals.estimatedHistoricalProfitCents)} estimated at ${formatPct(historicalMarginPct)} on historical revenue` : ""}
                {totals.projectedProfitCents ? ` + ${formatMoney(totals.projectedProfitCents)} projected for ${pendingEvents} past event${pendingEvents === 1 ? "" : "s"} with no costs entered yet` : ""}.
              </p>
            )}
            {totals.historicalThrough && (
              <p>
                Historical revenue covers {histMonths.map((r) => monthName(r.month, "short")).join(", ")}; payments in those months are already inside those totals
                {totals.paymentsInHistoricalCents ? ` (${formatMoney(totals.paymentsInHistoricalCents)} recorded in HQ, not counted again)` : ""}. Other months use payments recorded in HQ.
              </p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader title={`${year} by month`} description="Collected revenue and profit. Each month says whether its profit is actual or estimated." />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-xs text-ink-3">
                <tr className="border-b border-line">
                  <th className="py-2 text-left font-medium">Month</th>
                  <th className="py-2 text-left font-medium">Revenue source</th>
                  <th className="py-2 text-right font-medium">Collected</th>
                  <th className="py-2 text-right font-medium">Profit</th>
                  <th className="py-2 text-right font-medium">Margin</th>
                  <th className="py-2 text-right font-medium">Profit is</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {ytdRows.map((r) => {
                  const b = BASIS[r.basis];
                  return (
                    <tr key={r.month} className={cn(r.month === today.slice(0, 7) && "font-medium")}>
                      <td className="py-2.5">{monthName(r.month)}</td>
                      <td className="py-2.5 text-ink-2">{r.source === "historical" ? "Historical entry" : "Payments in HQ"}</td>
                      <td className="py-2.5 text-right tabular">{formatMoney(r.collectedCents)}</td>
                      <td className="py-2.5 text-right tabular">{r.basis === "none" ? "—" : formatMoney(r.profitCents)}</td>
                      <td className="py-2.5 text-right tabular">{r.basis === "none" || !r.profitRevenueCents ? "—" : formatPct((r.profitCents / r.profitRevenueCents) * 100)}</td>
                      <td className="py-2.5 text-right">{r.basis === "none" ? <span className="text-ink-4">—</span> : <Badge tone={b.tone} size="xs">{b.label}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-medium">
                  <td className="py-2.5" colSpan={2}>Year to date</td>
                  <td className="py-2.5 text-right tabular">{formatMoney(totals.collectedCents)}</td>
                  <td className="py-2.5 text-right tabular">{formatMoney(totals.profitCents)}</td>
                  <td className="py-2.5 text-right tabular">{formatPct(totals.marginPct)}</td>
                  <td className="py-2.5 text-right">{totals.includesEstimates ? <Badge tone="amber" size="xs">incl. estimates</Badge> : <Badge tone="sage" size="xs">Actual</Badge>}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-4">
            Profit for a month comes from its events: actual where costs are recorded, projected where they aren’t yet. Historical months are estimated at {formatPct(historicalMarginPct)} except for events with recorded costs.
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
