"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { parseReceipt } from "@/lib/server/receipts";
import { ExpenseCategory, ExpenseKind, PaymentKind } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/", "layout");

export async function setEventPrice(id: string, priceCents: number, keepDepositPct: boolean) {
  await requireUser();
  if (!Number.isFinite(priceCents) || priceCents < 0) return;
  const e = await db.event.findUniqueOrThrow({ where: { id }, select: { priceCents: true, depositCents: true } });
  const pct = e.priceCents > 0 ? e.depositCents / e.priceCents : 0.5;
  await db.event.update({ where: { id }, data: { priceCents, ...(keepDepositPct ? { depositCents: Math.round(priceCents * pct) } : {}) } });
  refresh();
}

/** Changing the platform changes commission and processing fees everywhere. */
export async function setEventPlatform(id: string, platformId: string | null) {
  await requireUser();
  await db.event.update({ where: { id }, data: { platformId } });
  refresh();
}

export async function addExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const amountCents = form.money(fd, "amount");
    if (amountCents === null) throw new FormError("Enter an amount.");
    await db.eventExpense.create({
      data: {
        eventId: form.req(fd, "eventId"),
        kind: form.enumOf(fd, "kind", ExpenseKind) ?? "PROJECTED",
        category: form.enumOf(fd, "category", ExpenseCategory) ?? "OTHER",
        description: form.str(fd, "description") ?? form.str(fd, "vendor") ?? "Expense",
        vendor: form.str(fd, "vendor"),
        amountCents,
        date: form.date(fd, "date"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function removeExpense(id: string) {
  await requireUser();
  await db.eventExpense.delete({ where: { id } });
  refresh();
}

export async function addPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const amountCents = form.money(fd, "amount");
    if (!amountCents || amountCents <= 0) throw new FormError("Enter the amount received.");
    const receivedOn = form.date(fd, "receivedOn");
    if (!receivedOn) throw new FormError("When was it received?");
    const eventId = form.req(fd, "eventId", "Event");
    const kind = form.enumOf(fd, "kind", PaymentKind) ?? "OTHER";
    const salesTaxCents = kind === "TIP" ? 0 : Math.max(0, form.money(fd, "salesTax") ?? 0);
    if (salesTaxCents > amountCents) throw new FormError("The sales tax can’t be more than the payment.");
    // The same amount on the same day for the same event is almost always a double entry.
    const dup = await db.payment.findFirst({ where: { eventId, amountCents, receivedOn }, select: { id: true } });
    if (dup && !form.bool(fd, "allowDuplicate")) {
      throw new FormError("This exact payment (same event, amount and date) is already recorded. If it really is a second payment, tick “This is a separate payment” and save again.");
    }
    await db.payment.create({
      data: {
        eventId,
        kind,
        amountCents,
        salesTaxCents,
        receivedOn,
        method: form.str(fd, "method"),
        notes: form.str(fd, "notes"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function removePayment(id: string) {
  await requireUser();
  await db.payment.delete({ where: { id } });
  refresh();
}

// ─── Quick Food Cost ────────────────────────────────────────────────────────
// What was actually spent on groceries, entered in seconds without recipes or shopping lists.
// Stored as actual FOOD expenses, which the profit engine already treats as the actual food cost.


export async function saveFoodCost(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const amountCents = form.money(fd, "amount");
    if (amountCents === null || amountCents <= 0) throw new FormError("Enter what you spent.");
    const vendor = form.str(fd, "vendor");
    const data = {
      amountCents,
      vendor,
      description: vendor ?? "Groceries",
      date: form.date(fd, "date"),
      notes: form.str(fd, "notes"),
    };
    const receipt = parseReceipt(fd);
    const id = form.str(fd, "id");
    if (id) {
      await db.eventExpense.update({
        where: { id, kind: "ACTUAL", category: "FOOD" },
        data: {
          ...data,
          ...(receipt
            ? { receipt: { upsert: { create: receipt, update: receipt } } }
            : form.bool(fd, "removeReceipt")
              ? { receipt: { delete: true } }
              : {}),
        },
      });
    } else {
      await db.eventExpense.create({
        data: { ...data, eventId: form.req(fd, "eventId"), kind: "ACTUAL", category: "FOOD", ...(receipt ? { receipt: { create: receipt } } : {}) },
      });
    }
    refresh();
    return { ok: true };
  });
}
