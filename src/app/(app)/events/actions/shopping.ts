"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { IngredientCategory, ShoppingStatus } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/", "layout");

/** Tap-to-toggle from shopping mode. Works for recipe ingredients and manual extras. */
export async function setShopStatus(eventId: string, key: string, status: ShoppingStatus) {
  await requireUser();
  if (key.startsWith("x:")) {
    await db.shoppingExtraItem.update({ where: { id: key.slice(2), eventId }, data: { status } });
  } else {
    await db.shoppingItemState.upsert({
      where: { eventId_ingredientId: { eventId, ingredientId: key } },
      create: { eventId, ingredientId: key, status },
      update: { status },
    });
  }
  refresh();
}

export async function updateShopItem(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const key = form.req(fd, "key");
    const status = form.enumOf(fd, "status", ShoppingStatus) ?? "PENDING";
    const actualPriceCents = form.money(fd, "actualPrice");
    const vendorId = form.str(fd, "vendorId");
    const notes = form.str(fd, "notes");
    if (key.startsWith("x:")) {
      await db.shoppingExtraItem.update({
        where: { id: key.slice(2), eventId },
        data: { status, actualPriceCents, vendorId, notes, quantity: form.str(fd, "quantityText") },
      });
    } else {
      const data = { status, actualPriceCents, vendorId, notes, substitution: form.str(fd, "substitution"), quantityOverride: form.num(fd, "quantityOverride") };
      await db.shoppingItemState.upsert({
        where: { eventId_ingredientId: { eventId, ingredientId: key } },
        create: { eventId, ingredientId: key, ...data },
        update: data,
      });
    }
    refresh();
    return { ok: true };
  });
}

export async function addShopExtra(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.shoppingExtraItem.create({
      data: {
        eventId: form.req(fd, "eventId"),
        name: form.req(fd, "name", "Item"),
        quantity: form.str(fd, "quantity"),
        category: form.enumOf(fd, "category", IngredientCategory) ?? "OTHER",
        vendorId: form.str(fd, "vendorId"),
        estimatedCents: form.money(fd, "estimated"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function removeShopExtra(id: string) {
  await requireUser();
  await db.shoppingExtraItem.delete({ where: { id } });
  refresh();
}

export async function resetShopping(eventId: string) {
  await requireUser();
  await db.shoppingItemState.deleteMany({ where: { eventId } });
  await db.shoppingExtraItem.updateMany({ where: { eventId }, data: { status: "PENDING", actualPriceCents: null } });
  refresh();
}
