"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
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
    await db.payment.create({
      data: {
        eventId: form.req(fd, "eventId"),
        kind: form.enumOf(fd, "kind", PaymentKind) ?? "OTHER",
        amountCents,
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
