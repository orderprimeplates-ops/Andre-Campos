"use server";

import { requireUser } from "@/lib/server/auth";
import { searchEverything } from "@/lib/server/search";
import { getToday } from "@/lib/server/settings";

export async function search(q: string) {
  await requireUser();
  const { today } = await getToday();
  return searchEverything(q.slice(0, 80), today);
}
