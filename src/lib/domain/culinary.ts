/**
 * The culinary engine: recipe scaling, costing, and menu → recipe requirements.
 *
 *   Ingredient price  →  recipe cost  →  dish cost per plate  →  event food cost
 *   Menu + guest count →  portions needed per recipe  →  scaled ingredient quantities
 *
 * Inputs are plain objects (not database rows) so this can be tested and reused anywhere,
 * including by a future AI assistant.
 */

import { convert, dimensionOf, normalizeUnit } from "./units";

export type ScalingMode = "LINEAR" | "FIXED" | "PARTIAL";

export interface IngredientCostInfo {
  id: string;
  name: string;
  category: string;
  packageQty: number;
  packageUnit: string;
  packagePriceCents: number;
  yieldPct: number;
  gramsPerMl?: number | null;
  gramsPerEach?: number | null;
  purchaseUnit?: string;
  preferredVendorId?: string | null;
  isPantryStaple?: boolean;
}

export interface RecipeLineInput {
  id?: string;
  quantity: number;
  unit: string;
  scalingMode: ScalingMode;
  scalingFactor: number;
  scalingNote?: string | null;
  prepNote?: string | null;
  ingredient: IngredientCostInfo;
}

export interface RecipeInput {
  id: string;
  name: string;
  yieldPortions: number;
  lines: RecipeLineInput[];
}

// ─── Scaling ────────────────────────────────────────────────────────────────

/**
 * How much of an ingredient line is needed when the recipe is multiplied by `factor`.
 * LINEAR  → qty × factor
 * FIXED   → qty (a bay leaf stays a bay leaf)
 * PARTIAL → qty × (1 + (factor − 1) × scalingFactor); salt at 0.75 for a doubled batch = 1.75×
 */
export function scaleLineQuantity(
  line: Pick<RecipeLineInput, "quantity" | "scalingMode" | "scalingFactor">,
  factor: number,
): number {
  if (factor <= 0) return 0;
  switch (line.scalingMode) {
    case "FIXED":
      return line.quantity;
    case "PARTIAL": {
      // With 0 ≤ s ≤ 1 the multiplier stays between `factor` and 1, so it never goes negative.
      const s = clamp(line.scalingFactor, 0, 1);
      return line.quantity * (1 + (factor - 1) * s);
    }
    default:
      return line.quantity * factor;
  }
}

export function scaleFactor(yieldPortions: number, targetPortions: number): number {
  if (!yieldPortions || yieldPortions <= 0) return 0;
  return targetPortions / yieldPortions;
}

// ─── Costing ────────────────────────────────────────────────────────────────

/** Cost in cents of one `packageUnit` of usable product, after trim/yield loss. */
export function costPerUsablePackageUnit(ing: IngredientCostInfo): number {
  const usable = ing.packageQty * (clamp(ing.yieldPct, 1, 100) / 100);
  if (usable <= 0) return 0;
  return ing.packagePriceCents / usable;
}

/** Cost in cents of `qty` `unit` of this ingredient, or null if the units can't be reconciled. */
export function ingredientCost(ing: IngredientCostInfo, qty: number, unit: string): number | null {
  const inPackageUnits = convert(qty, unit, ing.packageUnit, ing);
  if (inPackageUnits === null) return null;
  return inPackageUnits * costPerUsablePackageUnit(ing);
}

export interface CostResult {
  cents: number;
  /** Lines whose units could not be converted; their cost is excluded. */
  unpriced: { ingredient: string; unit: string }[];
}

export function recipeBatchCost(recipe: RecipeInput, factor = 1): CostResult {
  let cents = 0;
  const unpriced: CostResult["unpriced"] = [];
  for (const line of recipe.lines) {
    const qty = scaleLineQuantity(line, factor);
    const c = ingredientCost(line.ingredient, qty, line.unit);
    if (c === null) unpriced.push({ ingredient: line.ingredient.name, unit: line.unit });
    else cents += c;
  }
  return { cents, unpriced };
}

export function recipeCostPerPortion(recipe: RecipeInput): CostResult {
  const batch = recipeBatchCost(recipe, 1);
  return {
    cents: recipe.yieldPortions > 0 ? batch.cents / recipe.yieldPortions : 0,
    unpriced: batch.unpriced,
  };
}

export interface DishInput {
  id: string;
  name: string;
  components: { portionsPerServing: number; recipe: RecipeInput }[];
}

export function dishCostPerServing(dish: DishInput): CostResult {
  let cents = 0;
  const unpriced: CostResult["unpriced"] = [];
  for (const c of dish.components) {
    const r = recipeCostPerPortion(c.recipe);
    cents += r.cents * c.portionsPerServing;
    unpriced.push(...r.unpriced);
  }
  return { cents, unpriced };
}

// ─── Menu requirements ──────────────────────────────────────────────────────

export interface MenuInput {
  courses: {
    id: string;
    name: string;
    items: {
      id: string;
      guestCount?: number | null;
      portionsPerGuest: number;
      dish: DishInput;
    }[];
  }[];
}

export interface RecipeRequirement {
  recipe: RecipeInput;
  portions: number;
  factor: number;
  usedIn: string[]; // dish names
}

/** Menu + guest count → how many portions of each recipe to produce. */
export function menuRequirements(menu: MenuInput | null | undefined, guestCount: number): RecipeRequirement[] {
  const byRecipe = new Map<string, RecipeRequirement>();
  if (!menu) return [];
  for (const course of menu.courses) {
    for (const item of course.items) {
      const servings = (item.guestCount ?? guestCount) * item.portionsPerGuest;
      for (const comp of item.dish.components) {
        const portions = servings * comp.portionsPerServing;
        const existing = byRecipe.get(comp.recipe.id);
        if (existing) {
          existing.portions += portions;
          if (!existing.usedIn.includes(item.dish.name)) existing.usedIn.push(item.dish.name);
        } else {
          byRecipe.set(comp.recipe.id, { recipe: comp.recipe, portions, factor: 0, usedIn: [item.dish.name] });
        }
      }
    }
  }
  const out = [...byRecipe.values()];
  for (const r of out) r.factor = scaleFactor(r.recipe.yieldPortions, r.portions);
  return out;
}

/** Projected food cost for an event: sum of scaled recipe batches (partial scaling respected). */
export function eventFoodCost(menu: MenuInput | null | undefined, guestCount: number): CostResult {
  let cents = 0;
  const unpriced: CostResult["unpriced"] = [];
  for (const req of menuRequirements(menu, guestCount)) {
    const r = recipeBatchCost(req.recipe, req.factor);
    cents += r.cents;
    unpriced.push(...r.unpriced);
  }
  return { cents: Math.round(cents), unpriced: dedupeUnpriced(unpriced) };
}

// ─── Shopping list ──────────────────────────────────────────────────────────

export interface ShoppingLine {
  ingredient: IngredientCostInfo;
  /** Needed amount of usable product, expressed in the ingredient's packageUnit. */
  neededQty: number;
  /** Amount to purchase accounting for yield loss (packageUnit). */
  purchaseQty: number;
  /** Packages to buy: whole packages, or a weight/volume for items sold loose by the unit. */
  packages: number;
  /** True when the item is priced per unit (e.g. $/lb) rather than per package. */
  soldByUnit: boolean;
  isPantryStaple: boolean;
  unit: string;
  /** Cost of what is actually used. */
  usageCostCents: number;
  /** Cost of the whole packages bought. */
  purchaseCostCents: number;
  usedIn: string[];
  /** Recipe lines that couldn't be converted into the package unit. */
  unconverted: { qty: number; unit: string; recipe: string }[];
  scalingNotes: string[];
}

/**
 * Builds the master shopping list: scales every recipe to the menu, combines duplicate
 * ingredients across recipes, and converts everything into the unit you buy it in.
 */
export function buildShoppingList(menu: MenuInput | null | undefined, guestCount: number): ShoppingLine[] {
  const lines = new Map<string, ShoppingLine>();
  for (const req of menuRequirements(menu, guestCount)) {
    for (const rl of req.recipe.lines) {
      const ing = rl.ingredient;
      const qty = scaleLineQuantity(rl, req.factor);
      let line = lines.get(ing.id);
      if (!line) {
        line = {
          ingredient: ing,
          neededQty: 0,
          purchaseQty: 0,
          packages: 0,
          soldByUnit: isSoldByUnit(ing),
          isPantryStaple: !!ing.isPantryStaple,
          unit: normalizeUnit(ing.packageUnit),
          usageCostCents: 0,
          purchaseCostCents: 0,
          usedIn: [],
          unconverted: [],
          scalingNotes: [],
        };
        lines.set(ing.id, line);
      }
      const converted = convert(qty, rl.unit, ing.packageUnit, ing);
      if (converted === null) line.unconverted.push({ qty, unit: rl.unit, recipe: req.recipe.name });
      else line.neededQty += converted;
      if (!line.usedIn.includes(req.recipe.name)) line.usedIn.push(req.recipe.name);
      if (rl.scalingNote && rl.scalingMode !== "LINEAR") line.scalingNotes.push(rl.scalingNote);
    }
  }
  for (const line of lines.values()) {
    const ing = line.ingredient;
    const yieldFrac = clamp(ing.yieldPct, 1, 100) / 100;
    line.purchaseQty = line.neededQty / yieldFrac;
    const dim = dimensionOf(ing.packageUnit);
    const loose = line.soldByUnit && (dim === "mass" || dim === "volume");
    if (loose) {
      // Sold by weight/volume at the counter: buy what you need, rounded up to a sensible increment.
      line.packages = Math.max(0.25, Math.ceil(line.purchaseQty * 4 - 1e-9) / 4);
    } else {
      line.packages = ing.packageQty > 0 ? Math.max(1, Math.ceil(line.purchaseQty / ing.packageQty - 1e-9)) : 1;
    }
    line.usageCostCents = Math.round(line.neededQty * costPerUsablePackageUnit(ing));
    line.purchaseCostCents = Math.round(line.packages * ing.packagePriceCents);
  }
  return [...lines.values()].sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
}

/** Priced per single unit (e.g. "lb" at $15.99/lb, or "each"), not per multi-unit package. */
export function isSoldByUnit(ing: Pick<IngredientCostInfo, "packageQty" | "packageUnit" | "purchaseUnit">): boolean {
  if (ing.packageQty !== 1) return false;
  const pu = normalizeUnit(ing.purchaseUnit ?? "");
  return pu === normalizeUnit(ing.packageUnit);
}

/** Estimated spend at the store: packages bought, excluding pantry staples you already own. */
export function shoppingEstimate(lines: ShoppingLine[]): number {
  return lines.filter((l) => !l.isPantryStaple).reduce((s, l) => s + l.purchaseCostCents, 0);
}

// ─── helpers ────────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function dedupeUnpriced(list: CostResult["unpriced"]): CostResult["unpriced"] {
  const seen = new Set<string>();
  return list.filter((u) => {
    const k = `${u.ingredient}|${u.unit}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
