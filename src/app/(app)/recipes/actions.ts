"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { PrepPhase, RecipeCategory, ScalingMode } from "@/generated/prisma/enums";
import { normalizeUnit } from "@/lib/domain/units";

const refresh = () => revalidatePath("/", "layout");

function recipeData(fd: FormData) {
  const yieldPortions = form.num(fd, "yieldPortions");
  if (!yieldPortions || yieldPortions <= 0) throw new FormError("Yield must be more than zero portions.");
  return {
    name: form.req(fd, "name", "Recipe name"),
    category: form.enumOf(fd, "category", RecipeCategory) ?? "OTHER",
    yieldPortions,
    yieldDescription: form.str(fd, "yieldDescription"),
    method: form.str(fd, "method"),
    prepMinutes: form.int(fd, "prepMinutes"),
    cookMinutes: form.int(fd, "cookMinutes"),
    equipment: form.str(fd, "equipment"),
    allergens: form.tags(fd, "allergens"),
    dietaryTags: form.tags(fd, "dietaryTags"),
    holdingInstructions: form.str(fd, "holdingInstructions"),
    reheatingInstructions: form.str(fd, "reheatingInstructions"),
    transportNotes: form.str(fd, "transportNotes"),
    platingInstructions: form.str(fd, "platingInstructions"),
    chefNotes: form.str(fd, "chefNotes"),
    defaultPrepPhase: form.enumOf(fd, "defaultPrepPhase", PrepPhase) ?? "DAY_BEFORE",
  };
}

export async function createRecipe(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  let id = "";
  const res = await attempt(async () => {
    id = (await db.recipe.create({ data: recipeData(fd) })).id;
  });
  if (res?.error) return res;
  refresh();
  redirect(`/recipes/${id}`);
}

export async function updateRecipe(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.recipe.update({ where: { id: form.req(fd, "id") }, data: recipeData(fd) });
    refresh();
    return { ok: true };
  });
}

export async function saveRecipeLine(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const quantity = form.num(fd, "quantity");
    if (!quantity || quantity <= 0) throw new FormError("Enter a quantity.");
    const mode = form.enumOf(fd, "scalingMode", ScalingMode) ?? "LINEAR";
    const factorPct = form.num(fd, "scalingPct");
    const data = {
      ingredientId: form.req(fd, "ingredientId", "Ingredient"),
      quantity,
      unit: normalizeUnit(form.req(fd, "unit", "Unit")),
      prepNote: form.str(fd, "prepNote"),
      scalingMode: mode,
      scalingFactor: mode === "PARTIAL" ? Math.min(1, Math.max(0, (factorPct ?? 70) / 100)) : 1,
      scalingNote: form.str(fd, "scalingNote"),
    };
    const id = form.str(fd, "lineId");
    if (id) await db.recipeIngredient.update({ where: { id }, data });
    else {
      const recipeId = form.req(fd, "recipeId");
      const count = await db.recipeIngredient.count({ where: { recipeId } });
      await db.recipeIngredient.create({ data: { ...data, recipeId, sortOrder: count } });
    }
    refresh();
    return { ok: true };
  });
}

export async function removeRecipeLine(id: string) {
  await requireUser();
  await db.recipeIngredient.delete({ where: { id } });
  refresh();
}

export async function deleteRecipe(id: string) {
  await requireUser();
  const used = await db.dishComponent.count({ where: { recipeId: id } });
  if (used) return;
  await db.prepTask.updateMany({ where: { recipeId: id }, data: { recipeId: null } });
  await db.recipe.delete({ where: { id } });
  refresh();
  redirect("/recipes");
}
