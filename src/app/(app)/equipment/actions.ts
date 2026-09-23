"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { EquipmentCondition } from "@/generated/prisma/enums";

export async function saveEquipment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const owned = form.int(fd, "quantityOwned") ?? 0;
    const oos = form.int(fd, "quantityOutOfService") ?? 0;
    if (owned < 0 || oos < 0 || oos > owned) throw new FormError("Out-of-service can’t exceed the quantity owned.");
    const data = {
      name: form.req(fd, "name", "Item"),
      category: form.str(fd, "category") ?? "General",
      quantityOwned: owned,
      quantityOutOfService: oos,
      storageLocation: form.str(fd, "storageLocation"),
      condition: form.enumOf(fd, "condition", EquipmentCondition) ?? "GOOD",
      notes: form.str(fd, "notes"),
    };
    const id = form.str(fd, "id");
    if (id) await db.equipmentItem.update({ where: { id }, data });
    else await db.equipmentItem.create({ data });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
