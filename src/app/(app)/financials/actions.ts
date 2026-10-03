"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getToday } from "@/lib/server/settings";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { fromISODate } from "@/lib/domain/dates";
import { monthsOfYear } from "@/lib/domain/reporting";

/**
 * Saves a year of Historical Revenue in one go. A filled month replaces payment transactions for that
 * month in revenue totals; a blank month removes its entry so payments count again.
 */
export async function saveHistoricalRevenue(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const { today } = await getToday();
    const year = form.req(fd, "year");
    if (!/^\d{4}$/.test(year)) throw new FormError("Pick a year.");
    const margin = form.num(fd, "historicalMarginPct");
    if (margin !== null && (margin < 0 || margin > 100)) throw new FormError("The historical profit margin must be between 0% and 100%.");

    const writes = [];
    for (const month of monthsOfYear(year)) {
      const raw = form.str(fd, `m-${month}`);
      const date = fromISODate(`${month}-01`);
      if (raw === null) {
        writes.push(db.historicalRevenue.deleteMany({ where: { month: date } }));
        continue;
      }
      const cents = form.money(fd, `m-${month}`);
      if (cents === null || cents < 0) throw new FormError(`Check the amount for ${month}.`);
      if (month > today.slice(0, 7)) throw new FormError("Historical revenue is money already collected — future months can’t be entered.");
      writes.push(db.historicalRevenue.upsert({ where: { month: date }, create: { month: date, amountCents: cents }, update: { amountCents: cents } }));
    }
    if (margin !== null) writes.push(db.businessSettings.upsert({ where: { id: 1 }, create: { id: 1, historicalMarginPct: margin }, update: { historicalMarginPct: margin } }));
    await db.$transaction(writes);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
