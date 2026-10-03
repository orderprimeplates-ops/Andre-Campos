import { describe, expect, it } from "vitest";
import { actualEvent, foodCostVariance } from "../finance";
import { averageFoodCostPct, monthlyReport, sumReport, type ReportEvent } from "../reporting";

const ev = (date: string, revenueCents: number, profitCents: number, hasActualCosts: boolean, actualFoodCents: number | null = null): ReportEvent =>
  ({ date, revenueCents, profitCents, hasActualCosts, actualFoodCents });

describe("quick food cost", () => {
  it("uses the entered grocery total as actual food cost and flows into profit", () => {
    const a = actualEvent({
      collectedCents: 250000, priceCents: 250000, guestCount: 20, shoppingActualCents: 0, estimatedFoodCents: 52000, platform: null, assignments: [],
      actualExpenses: [{ category: "FOOD", amountCents: 31247 }, { category: "FOOD", amountCents: 6820 }, { category: "FOOD", amountCents: 9413 }],
    });
    expect(a.foodSource).toBe("receipts");
    expect(a.actualFoodCents).toBe(47480);
    expect(a.profitCents).toBe(250000 - 47480);
    expect(a.foodCostPct).toBeCloseTo(18.99, 1);
    expect(a.marginPct).toBeCloseTo(81.0, 1);
  });

  it("never counts receipts, shopping prices and the menu estimate together", () => {
    const base = { collectedCents: 100000, priceCents: 100000, guestCount: 10, platform: null, assignments: [] };
    expect(actualEvent({ ...base, shoppingActualCents: 30000, estimatedFoodCents: 40000, actualExpenses: [{ category: "FOOD", amountCents: 20000 }] }).totalCostCents).toBe(20000);
    expect(actualEvent({ ...base, shoppingActualCents: 30000, estimatedFoodCents: 40000, actualExpenses: [] }).totalCostCents).toBe(30000);
    const est = actualEvent({ ...base, shoppingActualCents: 0, estimatedFoodCents: 40000, actualExpenses: [] });
    expect(est.foodSource).toBe("estimate");
    expect(est.actualFoodCents).toBeNull();
    expect(est.totalCostCents).toBe(40000);
  });

  it("uses the booked price as revenue until it has all been collected", () => {
    const a = actualEvent({ collectedCents: 50000, priceCents: 200000, guestCount: 10, shoppingActualCents: 0, platform: null, assignments: [], actualExpenses: [] });
    expect(a.revenueCents).toBe(200000);
    expect(a.revenueBasis).toBe("booked");
  });

  it("reports variance between estimated and actual food cost", () => {
    expect(foodCostVariance(45000, 48736)).toMatchObject({ varianceCents: 3736 });
    expect(foodCostVariance(45000, null).varianceCents).toBeNull();
  });
});

describe("historical revenue", () => {
  const months = ["2026-08", "2026-09", "2026-10"];
  const historical = [{ month: "2026-08", amountCents: 1_000_000 }, { month: "2026-09", amountCents: 800_000 }];

  it("estimates profit at the historical margin and labels it", () => {
    const rows = monthlyReport({ months, historical, payments: [], events: [], historicalMarginPct: 70 });
    expect(rows[0]).toMatchObject({ source: "historical", collectedCents: 1_000_000, estimatedHistoricalProfitCents: 700_000, basis: "estimated" });
    const changed = monthlyReport({ months, historical, payments: [], events: [], historicalMarginPct: 60 });
    expect(changed[0].estimatedHistoricalProfitCents).toBe(600_000);
  });

  it("never double-counts payments inside a historical month", () => {
    const payments = [
      { receivedOn: "2026-09-12", amountCents: 150_000 }, // already inside September's historical total
      { receivedOn: "2026-10-02", amountCents: 90_000 }, // after the cutoff — counts normally
    ];
    const rows = monthlyReport({ months, historical, payments, events: [], historicalMarginPct: 70 });
    expect(rows[1].collectedCents).toBe(800_000);
    expect(rows[1].paymentsInHistoricalCents).toBe(150_000);
    expect(rows[2]).toMatchObject({ source: "payments", collectedCents: 90_000 });
    const total = sumReport(rows);
    expect(total.collectedCents).toBe(1_000_000 + 800_000 + 90_000);
    expect(total.historicalThrough).toBe("2026-09");
  });

  it("keeps actual profit for events with real costs and estimates only the rest", () => {
    const events = [ev("2026-08-15", 300_000, 240_000, true, 50_000), ev("2026-08-20", 200_000, 120_000, false)];
    const [aug] = monthlyReport({ months: ["2026-08"], historical, payments: [], events, historicalMarginPct: 70 });
    expect(aug.actualProfitCents).toBe(240_000);
    expect(aug.estimatedHistoricalProfitCents).toBe(Math.round(700_000 * 0.7));
    expect(aug.profitCents).toBe(240_000 + 490_000);
    expect(aug.basis).toBe("mixed");
  });

  it("never lets event profit exceed what the historical month collected", () => {
    const [aug] = monthlyReport({ months: ["2026-08"], historical, payments: [], events: [ev("2026-08-15", 2_000_000, 1_000_000, true, 0)], historicalMarginPct: 70 });
    expect(aug.actualProfitCents).toBe(500_000);
    expect(aug.estimatedHistoricalProfitCents).toBe(0);
  });

  it("uses actual event profit in tracked months and flags estimates in the year total", () => {
    const events = [ev("2026-10-01", 200_000, 150_000, true, 40_000)];
    const rows = monthlyReport({ months, historical, payments: [], events, historicalMarginPct: 70 });
    expect(rows[2]).toMatchObject({ basis: "actual", actualProfitCents: 150_000 });
    const total = sumReport(rows);
    expect(total.actualProfitCents).toBe(150_000);
    expect(total.estimatedHistoricalProfitCents).toBe(700_000 + 560_000);
    expect(total.includesEstimates).toBe(true);
    expect(sumReport([rows[2]]).includesEstimates).toBe(false);
  });

  it("averages food cost only over events with actual food spend", () => {
    expect(averageFoodCostPct([ev("2026-10-01", 200_000, 0, true, 50_000), ev("2026-10-02", 100_000, 0, false, null)])).toEqual({ pct: 25, events: 1 });
  });
});

describe("2026 opening financials (Feb–Sep)", () => {
  const entries = [
    ["2026-02", 1260775, 882543], ["2026-03", 1648746, 1154122], ["2026-04", 1345165, 941616], ["2026-05", 413450, 289415],
    ["2026-06", 322336, 225635], ["2026-07", 1515961, 1061173], ["2026-08", 1188290, 831803], ["2026-09", 763084, 534159],
  ] as const;
  const historical = entries.map(([month, amountCents]) => ({ month, amountCents }));
  const months = ["2026-01", ...entries.map(([m]) => m), "2026-10"];

  it("matches the expected monthly estimated profit to the cent and reconciles every month", () => {
    const rows = monthlyReport({ months, historical, payments: [], events: [], historicalMarginPct: 70 });
    for (const [m, rev, profit] of entries) {
      const r = rows.find((x) => x.month === m)!;
      expect(r).toMatchObject({ source: "historical", collectedCents: rev, estimatedHistoricalProfitCents: profit, basis: "estimated" });
      expect(r.estimatedHistoricalProfitCents + r.estimatedHistoricalExpensesCents).toBe(rev);
    }
    const t = sumReport(rows);
    expect(t.collectedCents).toBe(8_457_807); // $84,578.07
    expect(t.historicalCents).toBe(8_457_807);
    expect(t.estimatedHistoricalProfitCents).toBe(5_920_466); // $59,204.66 (sum of per-month rounding; $59,204.65 on the total)
    expect(t.estimatedHistoricalExpensesCents).toBe(2_537_341); // $25,373.41
    expect(t.historicalThrough).toBe("2026-09");
  });

  it("leaves January blank (not $0) and keeps October on tracked payments only", () => {
    const rows = monthlyReport({ months, historical, payments: [], events: [], historicalMarginPct: 70 });
    expect(rows[0]).toMatchObject({ month: "2026-01", source: "none", collectedCents: 0 });
    expect(rows.at(-1)).toMatchObject({ month: "2026-10", source: "none" });
    const oct = monthlyReport({ months: ["2026-10"], historical, payments: [{ receivedOn: "2026-10-04", amountCents: 200_000 }], events: [], historicalMarginPct: 70 });
    expect(oct[0]).toMatchObject({ source: "payments", collectedCents: 200_000 });
  });

  it("recalculates when the historical margin changes", () => {
    const t = sumReport(monthlyReport({ months, historical, payments: [], events: [], historicalMarginPct: 65 }));
    expect(t.estimatedHistoricalProfitCents + t.estimatedHistoricalExpensesCents).toBe(8_457_807);
    expect(t.estimatedHistoricalProfitCents).toBeGreaterThan(Math.floor(8_457_807 * 0.65) - 8);
    expect(t.estimatedHistoricalProfitCents).toBeLessThan(Math.ceil(8_457_807 * 0.65) + 8);
  });
});
