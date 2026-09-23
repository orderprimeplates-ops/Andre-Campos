"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { PackStatus } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/", "layout");

export async function addEventEquipment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const equipmentItemId = form.req(fd, "equipmentItemId", "Item");
    const quantity = form.int(fd, "quantity") ?? 1;
    if (quantity < 1) throw new FormError("Quantity must be at least 1.");
    await db.eventEquipment.upsert({
      where: { eventId_equipmentItemId: { eventId, equipmentItemId } },
      create: { eventId, equipmentItemId, quantity, notes: form.str(fd, "notes") },
      update: { quantity, notes: form.str(fd, "notes") },
    });
    refresh();
    return { ok: true };
  });
}

export async function setPackStatus(id: string, status: PackStatus) {
  await requireUser();
  await db.eventEquipment.update({ where: { id }, data: { status } });
  refresh();
}

export async function setPackQuantity(id: string, quantity: number) {
  await requireUser();
  if (quantity < 1) return;
  await db.eventEquipment.update({ where: { id }, data: { quantity } });
  refresh();
}

/** "Everything's in the van" — move every item at one stage to the next. */
export async function advanceAllPacking(eventId: string, from: PackStatus, to: PackStatus) {
  await requireUser();
  await db.eventEquipment.updateMany({ where: { eventId, status: from }, data: { status: to } });
  refresh();
}

export async function removeEventEquipment(id: string) {
  await requireUser();
  await db.eventEquipment.delete({ where: { id } });
  refresh();
}
