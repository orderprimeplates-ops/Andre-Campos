/**
 * Bridges database rows (Prisma) to the plain inputs the domain engine expects.
 * Also defines the standard `include` shapes so every page loads menus the same way.
 */

import type { Prisma } from "@/generated/prisma/client";
import type { DishInput, IngredientCostInfo, MenuInput, RecipeInput } from "./domain/culinary";
import type { ISODate } from "./domain/dates";
import { toISODate } from "./domain/dates";

export const recipeInclude = {
  ingredients: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.RecipeInclude;

export const dishInclude = {
  components: { include: { recipe: { include: recipeInclude } }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.DishInclude;

export const menuInclude = {
  courses: {
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" }, include: { dish: { include: dishInclude } } } },
  },
} satisfies Prisma.MenuInclude;

export type IngredientRow = Prisma.IngredientGetPayload<object>;
export type RecipeRow = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;
export type DishRow = Prisma.DishGetPayload<{ include: typeof dishInclude }>;
export type MenuRow = Prisma.MenuGetPayload<{ include: typeof menuInclude }>;

export function toIngredientInfo(i: IngredientRow): IngredientCostInfo {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    packageQty: i.packageQty,
    packageUnit: i.packageUnit,
    packagePriceCents: i.packagePriceCents,
    yieldPct: i.yieldPct,
    gramsPerMl: i.gramsPerMl,
    gramsPerEach: i.gramsPerEach,
    purchaseUnit: i.purchaseUnit,
    preferredVendorId: i.preferredVendorId,
    isPantryStaple: i.isPantryStaple,
  };
}

export function toRecipeInput(r: RecipeRow): RecipeInput & {
  defaultPrepPhase: RecipeRow["defaultPrepPhase"];
  prepMinutes: number | null;
  cookMinutes: number | null;
} {
  return {
    id: r.id,
    name: r.name,
    yieldPortions: r.yieldPortions,
    defaultPrepPhase: r.defaultPrepPhase,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    lines: r.ingredients.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      unit: l.unit,
      scalingMode: l.scalingMode,
      scalingFactor: l.scalingFactor,
      scalingNote: l.scalingNote,
      prepNote: l.prepNote,
      ingredient: toIngredientInfo(l.ingredient),
    })),
  };
}

export function toDishInput(d: DishRow): DishInput {
  return {
    id: d.id,
    name: d.name,
    components: d.components.map((c) => ({ portionsPerServing: c.portionsPerServing, recipe: toRecipeInput(c.recipe) })),
  };
}

export function toMenuInput(m: MenuRow | null | undefined): MenuInput | null {
  if (!m) return null;
  return {
    courses: m.courses.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        guestCount: i.guestCount,
        portionsPerGuest: i.portionsPerGuest,
        dish: toDishInput(i.dish),
      })),
    })),
  };
}

export function isoOrNull(d: Date | null | undefined): ISODate | null {
  return d ? toISODate(d) : null;
}

export function menuItemCount(m: { courses: { items: unknown[] }[] } | null | undefined): number {
  return m ? m.courses.reduce((s, c) => s + c.items.length, 0) : 0;
}
