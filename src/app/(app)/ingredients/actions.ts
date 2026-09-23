"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { IngredientCategory } from "@/generated/prisma/enums";
import { normalizeUnit } from "@/lib/domain/units";

function data(fd: FormData) {
  const packageQty = form.num(fd, "packageQty");
  if (!packageQty || packageQty <= 0) throw new FormError("Package size must be more than zero.");
  const yieldPct = form.num(fd, "yieldPct") ?? 100;
  if (yieldPct <= 0 || yieldPct > 100) throw new FormError("Usable yield must be between 1 and 100%.");
  return {
    name: form.req(fd, "name", "Name"),
    category: form.enumOf(fd, "category", IngredientCategory) ?? "OTHER",
    purchaseUnit: form.req(fd, "purchaseUnit", "How you buy it"),
    packageQty,
    packageUnit: normalizeUnit(form.req(fd, "packageUnit", "Package unit")),
    packagePriceCents: form.money(fd, "price") ?? 0,
    yieldPct,
    gramsPerMl: form.num(fd, "gramsPerMl"),
    gramsPerEach: form.num(fd, "gramsPerEach"),
    preferredVendorId: form.str(fd, "preferredVendorId"),
    isPantryStaple: form.bool(fd, "isPantryStaple"),
    notes: form.str(fd, "notes"),
  };
}

export async function saveIngredient(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const id = form.str(fd, "id");
    const d = data(fd);
    if (id) {
      const before = await db.ingredient.findUniqueOrThrow({ where: { id }, select: { packagePriceCents: true } });
      await db.ingredient.update({ where: { id }, data: { ...d, ...(before.packagePriceCents !== d.packagePriceCents ? { priceUpdatedAt: new Date() } : {}) } });
    } else {
      const dup = await db.ingredient.findUnique({ where: { name: d.name } });
      if (dup) throw new FormError(`“${d.name}” already exists.`);
      await db.ingredient.create({ data: d });
    }
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteIngredient(id: string) {
  await requireUser();
  const used = await db.recipeIngredient.count({ where: { ingredientId: id } });
  if (used) return;
  await db.ingredient.delete({ where: { id } });
  revalidatePath("/", "layout");
}
