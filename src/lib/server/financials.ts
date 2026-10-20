import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { loadEventSummaries } from "./events";
import { actualEvent, ownerCosts, type ExpenseInput } from "@/lib/domain/finance";
import { monthOf, monthlyReport, monthsOfYear, sumReport, type ReportEvent } from "@/lib/domain/reporting";
import { fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";

export const actualsSelect = {
  id: true, guestCount: true, priceCents: true, ownerHours: true, platform: true,
  payments: { select: { kind: true, amountCents: true, salesTaxCents: true } },
  expenses: { where: { kind: "ACTUAL" }, select: { category: true, amountCents: true } },
  shoppingStates: { select: { actualPriceCents: true } },
  shoppingExtras: { select: { actualPriceCents: true } },
  staffAssignments: { select: { rateCents: true, rateType: true, callTime: true, endTime: true, actualPayCents: true, staffMemberId: true, status: true } },
} satisfies Prisma.EventSelect;

type ActualsRow = Prisma.EventGetPayload<{ select: typeof actualsSelect }>;

/** One event's final profitability, plus whether any real expense data backs it. */
function ownerCostInputs(ownerHours: number | null, settings: OwnerCostSettings) {
  const c = ownerCosts(ownerHours, settings);
  return { ownerLaborCents: c.ownerLaborCents, overheadCents: c.overheadCents };
}

type OwnerCostSettings = { ownerHourlyRateCents: number; overheadPerEventCents: number };

export function computeActuals(r: ActualsRow, estimatedFoodCents: number, settings: OwnerCostSettings) {
  const shoppingActualCents = [...r.shoppingStates, ...r.shoppingExtras].reduce((s, x) => s + (x.actualPriceCents ?? 0), 0);
  const a = actualEvent({
    // Revenue excludes tips and the sales tax inside payments.
    collectedCents: r.payments.filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents - p.salesTaxCents, 0),
    priceCents: r.priceCents,
    guestCount: r.guestCount,
    actualExpenses: r.expenses as ExpenseInput[],
    shoppingActualCents,
    estimatedFoodCents,
    assignments: r.staffAssignments,
    platform: r.platform,
    ...ownerCostInputs(r.ownerHours, settings),
  });
  return { ...a, hasActualCosts: a.actualFoodCents !== null || r.expenses.length > 0 };
}

export async function actualsFor(events: { id: string; foodCost: { cents: number } }[]) {
  if (!events.length) return new Map<string, ReturnType<typeof computeActuals>>();
  const [rows, settings] = await Promise.all([db.event.findMany({ where: { id: { in: events.map((e) => e.id) } }, select: actualsSelect }), getSettings()]);
  const est = new Map(events.map((e) => [e.id, e.foodCost.cents]));
  return new Map(rows.map((r) => [r.id, computeActuals(r, est.get(r.id) ?? 0, settings)]));
}

/** Everything the year view needs: past events with profit, payments, and historical months. */
export async function loadYearData(year: string, today: ISODate) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const upTo = fromISODate(today < to ? today : to);
  const [settings, historical, payments, past, general] = await Promise.all([
    getSettings(),
    db.historicalRevenue.findMany({ where: { month: { gte: fromISODate(from), lte: fromISODate(to) } }, orderBy: { month: "asc" } }),
    // Collected means already received: a payment dated in the future doesn't count until that day.
    db.payment.findMany({ where: { receivedOn: { gte: fromISODate(from), lte: fromISODate(today < to ? today : to) }, kind: { not: "TIP" } }, select: { receivedOn: true, amountCents: true, salesTaxCents: true } }),
    // Only events that have happened carry profit; cancelled/unbooked never do.
    loadEventSummaries({ date: { gte: fromISODate(from), lte: fromISODate(today < to ? today : to) }, status: { in: ["BOOKED", "PLANNING", "READY", "COMPLETED"] } }, today),
    // Business expenses with no event (insurance, software…). Undated ones count on the day they were entered.
    db.eventExpense.findMany({
      where: { kind: "ACTUAL", eventId: null, OR: [{ date: { gte: fromISODate(from), lte: upTo } }, { date: null, createdAt: { gte: fromISODate(from), lte: new Date(upTo.getTime() + 86_400_000) } }] },
      select: { date: true, createdAt: true, amountCents: true },
    }),
  ]);
  const actuals = await actualsFor(past);
  const events: (ReportEvent & { id: string; name: string })[] = past.map((e) => {
    const a = actuals.get(e.id)!;
    return { id: e.id, name: e.name, date: e.date, revenueCents: a.revenueCents, profitCents: a.profitCents, hasActualCosts: a.hasActualCosts, actualFoodCents: a.actualFoodCents };
  });
  return {
    settings,
    historical: historical.map((h) => ({ id: h.id, month: monthOf(toISODate(h.month)), amountCents: h.amountCents, notes: h.notes })),
    payments: payments.map((p) => ({ receivedOn: toISODate(p.receivedOn), amountCents: p.amountCents - p.salesTaxCents })),
    events,
    generalExpenses: general.map((x) => ({ date: x.date ? toISODate(x.date) : x.createdAt.toISOString().slice(0, 10), amountCents: x.amountCents })),
  };
}

/** Year-to-date collected revenue and profit by month (historical + tracked), for Home and Money. */
export async function getYearSummary(today: ISODate) {
  const year = today.slice(0, 4);
  const data = await loadYearData(year, today);
  const rows = monthlyReport({
    months: monthsOfYear(year).filter((m) => m <= today.slice(0, 7)),
    historical: data.historical,
    payments: data.payments,
    events: data.events,
    historicalMarginPct: data.settings.historicalMarginPct,
    generalExpenses: data.generalExpenses,
  });
  return { year, rows, totals: sumReport(rows), thisMonth: rows.find((r) => r.month === today.slice(0, 7)) };
}
