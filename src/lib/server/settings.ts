import "server-only";
import { cache } from "react";
import { db } from "./db";
import { todayIn, nowTimeIn } from "@/lib/domain/dates";

export const getSettings = cache(async () => {
  const existing = await db.businessSettings.findUnique({ where: { id: 1 } });
  return existing ?? (await db.businessSettings.create({ data: { id: 1 } }));
});

/** Today's date and time in the business timezone. */
export async function getToday() {
  const s = await getSettings();
  return { today: todayIn(s.timezone), now: nowTimeIn(s.timezone), timezone: s.timezone };
}
