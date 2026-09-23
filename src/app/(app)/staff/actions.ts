"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { RateType, StaffRole } from "@/generated/prisma/enums";

export async function saveStaff(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const data = {
      name: form.req(fd, "name", "Name"),
      phone: form.str(fd, "phone"),
      email: form.str(fd, "email"),
      role: form.enumOf(fd, "role", StaffRole) ?? "OTHER",
      rateCents: form.money(fd, "rate") ?? 0,
      rateType: form.enumOf(fd, "rateType", RateType) ?? "HOURLY",
      notes: form.str(fd, "notes"),
      availabilityNotes: form.str(fd, "availabilityNotes"),
      reliabilityNotes: form.str(fd, "reliabilityNotes"),
      active: fd.has("id") ? form.bool(fd, "active") : true,
    };
    const id = form.str(fd, "id");
    if (id) await db.staffMember.update({ where: { id }, data });
    else await db.staffMember.create({ data });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
