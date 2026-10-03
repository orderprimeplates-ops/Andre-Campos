"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";

/** Setup & service notes that appear on the Staff Event Brief. */
export async function saveStaffNotes(eventId: string, notes: string) {
  await requireUser();
  const text = notes.trim().slice(0, 5000);
  await db.event.update({ where: { id: eventId }, data: { staffNotes: text || null } });
  revalidatePath(`/events/${eventId}/live`);
}
