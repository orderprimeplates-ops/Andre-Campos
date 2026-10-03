import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { loadEventSummaries } from "./events";
import { actualEvent, type ExpenseInput } from "@/lib/domain/finance";
import { monthOf, type ReportEvent } from "@/lib/domain/reporting";
import { fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";

export const actualsSelect = {
  id: true, guestCount: true, priceCents: true, platform: true,
  payments: { select: { kind: true, amountCents: true } },
  expenses: { where: { kind: "ACTUAL" }, select: { category: true, amountCents: true } },
  shoppingStates: { select: { actualPriceCents: true } },
  shoppingExtras: { select: { actualPriceCents: true } },
  staffAssignments: { select: { rateCents: true, rateType: true, callTime: true, endTime: true, actualPayCents: true, staffMemberId: true, status: true } },
} satisfies Prisma.EventSelect;

type ActualsRow = Prisma.EventGetPayload<{ select: typeof actualsSelect }>;

/** One event's final profitability, plus whether any real expense data backs it. */
export function computeActuals(r: ActualsRow, estimatedFoodCents: number) {
  const shoppingActualCents = [...r.shoppingStates, ...r.shoppingExtras].reduce((s, x) => s + (x.actualPriceCents ?? 0), 0);
  const a = actualEvent({
    collectedCents: r.payments.filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents, 0),
    priceCents: r.priceCents,
    guestCount: r.guestCount,
    actualExpenses: r.expenses as ExpenseInput[],
    shoppingActualCents,
    estimatedFoodCents,
    assignments: r.staffAssignments,
    platform: r.platform,
  });
  return { ...a, hasActualCosts: a.actualFoodCents !== null || r.expenses.length > 0 };
}

export async function actualsFor(events: { id: string; foodCost: { cents: number } }[]) {
  if (!events.length) return new Map<string, ReturnType<typeof computeActuals>>();
  const rows = await db.event.findMany({ where: { id: { in: events.map((e) => e.id) } }, select: actualsSelect });
  const est = new Map(events.map((e) => [e.id, e.foodCost.cents]));
  return new Map(rows.map((r) => [r.id, computeActuals(r, est.get(r.id) ?? 0)]));
}

/** Everything the year view needs: past events with profit, payments, and historical months. */
export async function loadYearData(year: string, today: ISODate) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [settings, historical, payments, past] = await Promise.all([
    getSettings(),
    db.historicalRevenue.findMany({ where: { month: { gte: fromISODate(from), lte: fromISODate(to) } }, orderBy: { month: "asc" } }),
    db.payment.findMany({ where: { receivedOn: { gte: fromISODate(from), lte: fromISODate(to) }, kind: { not: "TIP" } }, select: { receivedOn: true, amountCents: true } }),
    // Only events that have happened carry profit; cancelled/unbooked never do.
    loadEventSummaries({ date: { gte: fromISODate(from), lte: fromISODate(today < to ? today : to) }, status: { in: ["BOOKED", "PLANNING", "READY", "COMPLETED"] } }, today),
  ]);
  const actuals = await actualsFor(past);
  const events: (ReportEvent & { id: string; name: string })[] = past.map((e) => {
    const a = actuals.get(e.id)!;
    return { id: e.id, name: e.name, date: e.date, revenueCents: a.revenueCents, profitCents: a.profitCents, hasActualCosts: a.hasActualCosts, actualFoodCents: a.actualFoodCents };
  });
  return {
    settings,
    historical: historical.map((h) => ({ id: h.id, month: monthOf(toISODate(h.month)), amountCents: h.amountCents, notes: h.notes })),
    payments: payments.map((p) => ({ receivedOn: toISODate(p.receivedOn), amountCents: p.amountCents })),
    events,
  };
}
