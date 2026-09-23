import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { menuInclude, menuItemCount, toMenuInput, isoOrNull } from "@/lib/mappers";
import { eventFoodCost } from "@/lib/domain/culinary";
import { paymentSummary, projectEvent, projectedLabor, type ExpenseInput } from "@/lib/domain/finance";
import { kitchenReadiness } from "@/lib/domain/kitchen";
import { toISODate, type ISODate } from "@/lib/domain/dates";
import type { AttentionEvent } from "@/lib/domain/attention";
import type { CalendarEventInput } from "@/lib/domain/calendar";

export const eventSummaryInclude = {
  client: { select: { id: true, name: true, company: true } },
  venue: true,
  platform: true,
  menu: { include: menuInclude },
  staffAssignments: { select: { id: true, staffMemberId: true, status: true, role: true, rateCents: true, rateType: true, callTime: true, endTime: true, actualPayCents: true } },
  payments: { select: { kind: true, amountCents: true } },
  expenses: { where: { kind: "PROJECTED" }, select: { category: true, amountCents: true } },
  prepTasks: { select: { status: true } },
  equipment: { select: { status: true } },
} satisfies Prisma.EventInclude;

export type EventWithSummaryData = Prisma.EventGetPayload<{ include: typeof eventSummaryInclude }>;

export function summarizeEvent(
  e: EventWithSummaryData,
  settings: { targetMarginPct: number; minimumMarginPct: number; mileageRateCents: number },
  today: ISODate,
) {
  const date = toISODate(e.date);
  const menuInput = toMenuInput(e.menu);
  const food = eventFoodCost(menuInput, e.guestCount);
  const laborCents = projectedLabor(e.staffAssignments);
  const projection = projectEvent({
    priceCents: e.priceCents,
    guestCount: e.guestCount,
    foodCostCents: food.cents,
    laborCents,
    roundTripMiles: e.roundTripMiles,
    expenses: e.expenses as ExpenseInput[],
    platform: e.platform,
    settings,
  });
  const payment = paymentSummary(
    { priceCents: e.priceCents, depositCents: e.depositCents, balanceDueDate: isoOrNull(e.balanceDueDate), date },
    e.payments,
    today,
  );
  const assigned = e.staffAssignments.filter((a) => a.staffMemberId);
  const staffing = {
    total: e.staffAssignments.length,
    open: e.staffAssignments.filter((a) => !a.staffMemberId).length,
    confirmed: assigned.filter((a) => ["CONFIRMED", "COMPLETED", "PAID"].includes(a.status)).length,
    unconfirmed: assigned.filter((a) => a.status === "NEEDED" || a.status === "INVITED").length,
  };
  const kitchen = kitchenReadiness(e.venue);
  const prep = { total: e.prepTasks.length, complete: e.prepTasks.filter((t) => t.status === "COMPLETE").length };
  const packing = { total: e.equipment.length, packed: e.equipment.filter((t) => t.status !== "REQUIRED").length };
  const items = menuItemCount(e.menu);
  const isDropOff = e.serviceStyle === "DROP_OFF" || e.eventType === "DROP_OFF";

  // "How ready is this event?" — a simple checklist the dashboard can show as one number.
  const checks = [
    { label: "Menu approved", done: e.menu?.status === "APPROVED" && items > 0 },
    { label: "Guest count confirmed", done: e.guestCountConfirmed },
    { label: "Deposit received", done: payment.depositOutstandingCents === 0 },
    { label: "Staff confirmed", done: staffing.open === 0 && staffing.unconfirmed === 0 },
    ...(isDropOff ? [] : [{ label: "Kitchen details", done: kitchen.hasVenue && kitchen.missingCritical.length === 0 }]),
    { label: "Prep complete", done: prep.total > 0 && prep.complete === prep.total },
  ];
  const readinessPct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);

  return {
    id: e.id,
    name: e.name,
    client: e.client,
    eventType: e.eventType,
    serviceStyle: e.serviceStyle,
    status: e.status,
    date,
    endDate: isoOrNull(e.endDate),
    arrivalTime: e.arrivalTime,
    serviceTime: e.serviceTime,
    endTime: e.endTime,
    guestCount: e.guestCount,
    guestCountConfirmed: e.guestCountConfirmed,
    finalCountDueDate: isoOrNull(e.finalCountDueDate),
    depositDueDate: isoOrNull(e.depositDueDate),
    balanceDueDate: isoOrNull(e.balanceDueDate),
    shoppingDate: isoOrNull(e.shoppingDate),
    prepStartDate: isoOrNull(e.prepStartDate),
    venue: e.venue ? { id: e.venue.id, name: e.venue.name, city: e.venue.city, address: e.venue.address } : null,
    platform: e.platform ? { id: e.platform.id, name: e.platform.name } : null,
    priceCents: e.priceCents,
    menuStatus: e.menu?.status ?? null,
    menuItemCount: items,
    foodCost: food,
    laborCents,
    projection,
    payment,
    staffing,
    kitchen,
    prep,
    packing,
    checks,
    readinessPct,
    isDropOff,
  };
}

export type EventSummary = ReturnType<typeof summarizeEvent>;

export async function loadEventSummaries(where: Prisma.EventWhereInput, today: ISODate, orderBy: Prisma.EventOrderByWithRelationInput = { date: "asc" }) {
  const [settings, rows] = await Promise.all([
    getSettings(),
    db.event.findMany({ where, include: eventSummaryInclude, orderBy }),
  ]);
  return rows.map((r) => summarizeEvent(r, settings, today));
}

export function toAttentionEvent(s: EventSummary): AttentionEvent {
  return {
    id: s.id,
    name: s.name,
    clientName: s.client.name,
    date: s.date,
    status: s.status,
    guestCountConfirmed: s.guestCountConfirmed,
    finalCountDueDate: s.finalCountDueDate,
    depositDueDate: s.depositDueDate,
    balanceDueDate: s.balanceDueDate,
    shoppingDate: s.shoppingDate,
    prepStartDate: s.prepStartDate,
    menuStatus: s.menuStatus,
    menuItemCount: s.menuItemCount,
    depositOutstandingCents: s.payment.depositOutstandingCents,
    balanceCents: s.payment.balanceCents,
    openStaffRoles: s.staffing.open,
    unconfirmedStaff: s.staffing.unconfirmed,
    kitchenMissingCritical: s.kitchen.missingCritical,
    hasVenue: s.kitchen.hasVenue,
    isDropOff: s.isDropOff,
  };
}

export function toCalendarEvent(s: EventSummary): CalendarEventInput {
  return {
    id: s.id,
    name: s.name,
    clientName: s.client.name,
    eventType: s.eventType,
    status: s.status,
    date: s.date,
    endDate: s.endDate,
    serviceTime: s.serviceTime,
    guestCount: s.guestCount,
    guestCountConfirmed: s.guestCountConfirmed,
    finalCountDueDate: s.finalCountDueDate,
    depositDueDate: s.depositDueDate,
    balanceDueDate: s.balanceDueDate,
    shoppingDate: s.shoppingDate,
    prepStartDate: s.prepStartDate,
    depositOutstandingCents: s.payment.depositOutstandingCents,
    balanceCents: s.payment.balanceCents,
  };
}
