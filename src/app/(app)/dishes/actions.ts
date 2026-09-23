"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { Course, HoldingQuality, Level, ServiceStyle } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/", "layout");

function dishData(fd: FormData) {
  return {
    name: form.req(fd, "name", "Dish name"),
    description: form.str(fd, "description"),
    course: form.enumOf(fd, "course", Course) ?? "ENTREE",
    cuisine: form.str(fd, "cuisine"),
    protein: form.str(fd, "protein"),
    dietaryTags: form.tags(fd, "dietaryTags"),
    allergens: form.tags(fd, "allergens"),
    serviceStyles: form.list(fd, "serviceStyles").filter((s): s is ServiceStyle => (Object.values(ServiceStyle) as string[]).includes(s)),
    difficulty: form.enumOf(fd, "difficulty", Level) ?? "MEDIUM",
    prepIntensity: form.enumOf(fd, "prepIntensity", Level) ?? "MEDIUM",
    platingDifficulty: form.enumOf(fd, "platingDifficulty", Level) ?? "MEDIUM",
    holdingQuality: form.enumOf(fd, "holdingQuality", HoldingQuality) ?? "GOOD",
    chefNotes: form.str(fd, "chefNotes"),
  };
}

export async function createDish(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  let id = "";
  const res = await attempt(async () => {
    id = (await db.dish.create({ data: { ...dishData(fd), inLibrary: true } })).id;
  });
  if (res?.error) return res;
  refresh();
  redirect(`/dishes/${id}`);
}

export async function updateDish(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.dish.update({ where: { id: form.req(fd, "id") }, data: { ...dishData(fd), inLibrary: form.bool(fd, "inLibrary") } });
    refresh();
    return { ok: true };
  });
}

export async function addComponent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const dishId = form.req(fd, "dishId");
    const portions = form.num(fd, "portionsPerServing") ?? 1;
    if (portions <= 0) throw new FormError("Portions per plate must be more than zero.");
    const count = await db.dishComponent.count({ where: { dishId } });
    await db.dishComponent.create({ data: { dishId, recipeId: form.req(fd, "recipeId", "Recipe"), portionsPerServing: portions, notes: form.str(fd, "notes"), sortOrder: count } });
    refresh();
    return { ok: true };
  });
}

export async function updateComponent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const portions = form.num(fd, "portionsPerServing") ?? 1;
    if (portions <= 0) throw new FormError("Portions per plate must be more than zero.");
    await db.dishComponent.update({ where: { id: form.req(fd, "id") }, data: { portionsPerServing: portions, notes: form.str(fd, "notes") } });
    refresh();
    return { ok: true };
  });
}

export async function removeComponent(id: string) {
  await requireUser();
  await db.dishComponent.delete({ where: { id } });
  refresh();
}

export async function archiveDish(id: string, archived: boolean) {
  await requireUser();
  await db.dish.update({ where: { id }, data: { archived } });
  refresh();
}
