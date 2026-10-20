"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getToday } from "@/lib/server/settings";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { parseReceipt } from "@/lib/server/receipts";
import { paymentSummary } from "@/lib/domain/finance";
import { addDays, fromISODate, toISODate } from "@/lib/domain/dates";
import { ExpenseCategory } from "@/generated/prisma/enums";


/**
 * Quick expense: amount + category, optionally tied to an event (which then counts it in that
 * event's profit). Stored as an actual expense — the same records the event pages already use,
 * so nothing is ever entered twice.
 */
export async function saveExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const amountCents = form.money(fd, "amount");
    if (amountCents === null || amountCents <= 0) throw new FormError("Enter the amount.");
    const category = form.enumOf(fd, "category", ExpenseCategory);
    if (!category) throw new FormError("Choose a category.");
    const { today } = await getToday();
    const id = form.str(fd, "id");
    // New expenses default to today; editing an undated expense leaves it undated.
    const date = form.date(fd, "date") ?? (id ? null : fromISODate(today));
    const eventId = form.str(fd, "eventId");
    if (eventId && !(await db.event.findUnique({ where: { id: eventId }, select: { id: true } }))) throw new FormError("That event no longer exists.");
    const vendor = form.str(fd, "vendor");

    if (!id) {
      const dup = await db.eventExpense.findFirst({ where: { kind: "ACTUAL", amountCents, date, category, eventId: eventId ?? null }, select: { id: true } });
      if (dup && !form.bool(fd, "allowDuplicate")) {
        throw new FormError("An expense with the same amount, category and date is already recorded. If this is a second one, tick “This is a separate expense” and save again.");
      }
    }
    const receipt = parseReceipt(fd);
    const data = {
      eventId: eventId ?? null,
      kind: "ACTUAL" as const,
      category,
      amountCents,
      date,
      vendor,
      description: vendor ?? form.str(fd, "notes") ?? "Expense",
      notes: form.str(fd, "notes"),
      paymentMethod: form.str(fd, "paymentMethod"),
    };
    if (id) {
      await db.eventExpense.update({
        where: { id, kind: "ACTUAL" },
        data: { ...data, ...(receipt ? { receipt: { upsert: { create: receipt, update: receipt } } } : form.bool(fd, "removeReceipt") ? { receipt: { delete: true } } : {}) },
      });
    } else {
      await db.eventExpense.create({ data: { ...data, ...(receipt ? { receipt: { create: receipt } } : {}) } });
    }
    revalidatePath("/", "layout");
    return { ok: true, message: "Expense saved." };
  });
}

/** Events offered in + Add: recent and upcoming bookings, with what's still owed. */
export async function quickAddEvents() {
  await requireUser();
  const { today } = await getToday();
  const rows = await db.event.findMany({
    where: { status: { notIn: ["CANCELLED", "INQUIRY"] }, date: { gte: fromISODate(addDays(today, -120)), lte: fromISODate(addDays(today, 365)) } },
    orderBy: { date: "asc" },
    select: {
      id: true, name: true, date: true, priceCents: true, depositCents: true, salesTaxCents: true, balanceDueDate: true,
      client: { select: { name: true } },
      payments: { select: { kind: true, amountCents: true, salesTaxCents: true } },
    },
  });
  const events = rows.map((e) => {
    const date = toISODate(e.date);
    const p = paymentSummary({ priceCents: e.priceCents, depositCents: e.depositCents, salesTaxCents: e.salesTaxCents, date, balanceDueDate: e.balanceDueDate ? toISODate(e.balanceDueDate) : null }, e.payments, today);
    return { id: e.id, name: e.name, clientName: e.client.name, date, priceCents: e.priceCents, salesTaxCents: e.salesTaxCents, depositOutstandingCents: p.depositOutstandingCents, balanceCents: p.balanceCents, past: date < today };
  });
  // "Today" in the business timezone, so entries are never dated by a phone set to another zone.
  return { today, events };
}

export type QuickAddEvent = Awaited<ReturnType<typeof quickAddEvents>>["events"][number];
