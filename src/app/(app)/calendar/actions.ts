"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { FormError } from "@/lib/server/forms";
import { CalendarEntryType } from "@/generated/prisma/enums";

export async function createCalendarEntry(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const date = form.date(fd, "date");
    if (!date) throw new FormError("Pick a date.");
    await db.calendarEntry.create({
      data: {
        title: form.req(fd, "title", "Title"),
        type: form.enumOf(fd, "type", CalendarEntryType) ?? "OTHER",
        date,
        startTime: form.time(fd, "startTime"),
        endTime: form.time(fd, "endTime"),
        eventId: form.str(fd, "eventId"),
        notes: form.str(fd, "notes"),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteCalendarEntry(id: string) {
  await requireUser();
  await db.calendarEntry.delete({ where: { id } });
  revalidatePath("/", "layout");
}
