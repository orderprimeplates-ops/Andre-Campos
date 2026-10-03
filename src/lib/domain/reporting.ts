/**
 * Business reporting across months: collected revenue and profit, combining
 * individually tracked events/payments with Historical Revenue ("opening financials").
 *
 * The no-double-counting rule is per month:
 *   - A month with a Historical Revenue entry takes its collected revenue from that entry ONLY.
 *     Payments received in that month are already inside the historical total, so they are ignored.
 *   - Every other month takes its collected revenue from payment transactions.
 * So "historical through September" means Jan–Sep come from the entries and October onward from payments.
 *
 * Profit:
 *   - Events with actual costs recorded (quick food cost, receipts, staff pay…) use their actual profit.
 *   - In a historical month, the part of the historical total not covered by such events is estimated at
 *     the historical margin (default 70%).
 *   - In a tracked month, past events without any actual costs use their projected profit (an estimate).
 */

import type { ISODate } from "./dates";

export type MonthKey = string; // "YYYY-MM"

export interface ReportEvent {
  date: ISODate;
  revenueCents: number;
  profitCents: number;
  /** True when real expense data exists (food cost entries, receipts, shopping prices, staff pay). */
  hasActualCosts: boolean;
  /** Actual food spend, or null when only the menu estimate is known. */
  actualFoodCents: number | null;
}

export interface ReportPayment {
  receivedOn: ISODate;
  amountCents: number; // tips excluded by the caller
}

export interface HistoricalEntry {
  month: MonthKey;
  amountCents: number;
}

export type ProfitBasis = "actual" | "estimated" | "mixed" | "none";

export interface MonthRow {
  month: MonthKey;
  /** "none" = no historical entry and nothing tracked: the month is blank/unknown, not $0. */
  source: "historical" | "payments" | "none";
  collectedCents: number;
  /** Payments received in a historical month — shown for transparency, never added to revenue. */
  paymentsInHistoricalCents: number;
  actualProfitCents: number;
  estimatedHistoricalProfitCents: number;
  /** The rest of the estimated part of a historical month: revenue × (100% − margin). Always an estimate. */
  estimatedHistoricalExpensesCents: number;
  /** Past events with no actual costs entered yet, at their projected profit. */
  projectedProfitCents: number;
  profitCents: number;
  /** Revenue the profit figure is based on (for margin). */
  profitRevenueCents: number;
  basis: ProfitBasis;
}

export const monthOf = (d: ISODate): MonthKey => d.slice(0, 7);

/**
 * revenue × pct%, rounded half-up to the cent with integer math. (Multiplying by 0.7 in floating point
 * turns $9,416.155 into $9,416.15 — this keeps it $9,416.16.)
 */
export function pctOfCents(cents: number, pct: number): number {
  const scaled = Math.round(pct * 1000); // pct to 3 decimals, as an integer
  return Math.round((cents * scaled) / 100_000);
}

function basisOf(actual: boolean, estimated: boolean): ProfitBasis {
  if (actual && estimated) return "mixed";
  if (actual) return "actual";
  if (estimated) return "estimated";
  return "none";
}

export function monthlyReport(input: {
  months: MonthKey[];
  historical: HistoricalEntry[];
  payments: ReportPayment[];
  /** Past, non-cancelled events. */
  events: ReportEvent[];
  historicalMarginPct: number;
}): MonthRow[] {
  const hist = new Map(input.historical.map((h) => [h.month, h.amountCents]));

  return input.months.map((month) => {
    const payments = input.payments.filter((p) => monthOf(p.receivedOn) === month).reduce((s, p) => s + p.amountCents, 0);
    const events = input.events.filter((e) => monthOf(e.date) === month);
    const withActuals = events.filter((e) => e.hasActualCosts);
    const historicalCents = hist.get(month);
    let actualProfitCents = withActuals.reduce((s, e) => s + e.profitCents, 0);

    if (historicalCents !== undefined) {
      // Events with real costs carve their revenue out of the historical total; the rest is estimated.
      const eventRevenue = withActuals.reduce((s, e) => s + e.revenueCents, 0);
      const covered = Math.min(historicalCents, eventRevenue);
      // If those events add up to more than was collected that month, count their profit only in proportion.
      if (eventRevenue > historicalCents) actualProfitCents = Math.round((actualProfitCents * historicalCents) / eventRevenue);
      const estimatedRevenue = historicalCents - covered;
      const estimatedHistoricalProfitCents = pctOfCents(estimatedRevenue, input.historicalMarginPct);
      return {
        month,
        source: "historical",
        collectedCents: historicalCents,
        paymentsInHistoricalCents: payments,
        actualProfitCents,
        estimatedHistoricalProfitCents,
        // Expenses = revenue − profit, so every month reconciles to the cent.
        estimatedHistoricalExpensesCents: estimatedRevenue - estimatedHistoricalProfitCents,
        projectedProfitCents: 0,
        profitCents: actualProfitCents + estimatedHistoricalProfitCents,
        profitRevenueCents: historicalCents,
        basis: basisOf(withActuals.length > 0, historicalCents - covered > 0),
      };
    }

    const pending = events.filter((e) => !e.hasActualCosts);
    const projectedProfitCents = pending.reduce((s, e) => s + e.profitCents, 0);
    return {
      month,
      source: payments === 0 && events.length === 0 ? "none" : "payments",
      collectedCents: payments,
      paymentsInHistoricalCents: 0,
      actualProfitCents,
      estimatedHistoricalProfitCents: 0,
      estimatedHistoricalExpensesCents: 0,
      projectedProfitCents,
      profitCents: actualProfitCents + projectedProfitCents,
      profitRevenueCents: events.reduce((s, e) => s + e.revenueCents, 0),
      basis: basisOf(withActuals.length > 0, pending.length > 0),
    };
  });
}

export function sumReport(rows: MonthRow[]) {
  const sum = (k: keyof MonthRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
  const profitCents = sum("profitCents");
  const profitRevenueCents = sum("profitRevenueCents");
  const estimatedHistoricalProfitCents = sum("estimatedHistoricalProfitCents");
  const projectedProfitCents = sum("projectedProfitCents");
  return {
    collectedCents: sum("collectedCents"),
    historicalCents: rows.filter((r) => r.source === "historical").reduce((s, r) => s + r.collectedCents, 0),
    paymentsInHistoricalCents: sum("paymentsInHistoricalCents"),
    actualProfitCents: sum("actualProfitCents"),
    estimatedHistoricalProfitCents,
    estimatedHistoricalExpensesCents: sum("estimatedHistoricalExpensesCents"),
    projectedProfitCents,
    profitCents,
    profitRevenueCents,
    marginPct: profitRevenueCents > 0 ? (profitCents / profitRevenueCents) * 100 : null,
    includesEstimates: estimatedHistoricalProfitCents !== 0 || projectedProfitCents !== 0,
    historicalThrough: rows.filter((r) => r.source === "historical").map((r) => r.month).sort().at(-1) ?? null,
  };
}

/** Average food cost % across events where actual food spend is known (weighted by revenue). */
export function averageFoodCostPct(events: ReportEvent[]) {
  const known = events.filter((e) => e.actualFoodCents !== null && e.revenueCents > 0);
  const revenue = known.reduce((s, e) => s + e.revenueCents, 0);
  const food = known.reduce((s, e) => s + e.actualFoodCents!, 0);
  return { pct: revenue > 0 ? (food / revenue) * 100 : null, events: known.length };
}

/** "2026-01" … "2026-12" */
export function monthsOfYear(year: string | number): MonthKey[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}
