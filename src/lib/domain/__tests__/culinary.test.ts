import { describe, expect, it } from "vitest";
import {
  buildShoppingList,
  dishCostPerServing,
  eventFoodCost,
  ingredientCost,
  menuRequirements,
  recipeCostPerPortion,
  scaleLineQuantity,
  shoppingEstimate,
  type IngredientCostInfo,
  type MenuInput,
  type RecipeInput,
} from "../culinary";

const butter: IngredientCostInfo = {
  id: "butter", name: "Butter", category: "DAIRY", packageQty: 1, packageUnit: "lb",
  packagePriceCents: 500, yieldPct: 100, gramsPerMl: 0.911,
};
const salmon: IngredientCostInfo = {
  id: "salmon", name: "Salmon", category: "SEAFOOD", packageQty: 10, packageUnit: "lb",
  packagePriceCents: 12000, yieldPct: 80,
};
const salt: IngredientCostInfo = {
  id: "salt", name: "Kosher Salt", category: "DRY_GOODS", packageQty: 48, packageUnit: "oz",
  packagePriceCents: 480, yieldPct: 100, gramsPerMl: 0.54,
};
const shallot: IngredientCostInfo = {
  id: "shallot", name: "Shallot", category: "PRODUCE", packageQty: 1, packageUnit: "lb",
  packagePriceCents: 400, yieldPct: 90, gramsPerEach: 45,
};

const beurreBlanc: RecipeInput = {
  id: "bb", name: "Beurre Blanc", yieldPortions: 8,
  lines: [
    { quantity: 1, unit: "cup", scalingMode: "LINEAR", scalingFactor: 1, ingredient: butter },
    { quantity: 2, unit: "ea", scalingMode: "LINEAR", scalingFactor: 1, ingredient: shallot },
    { quantity: 1, unit: "tsp", scalingMode: "PARTIAL", scalingFactor: 0.5, scalingNote: "Season to taste", ingredient: salt },
  ],
};
const seared: RecipeInput = {
  id: "sal", name: "Seared Salmon", yieldPortions: 4,
  lines: [{ quantity: 1.5, unit: "lb", scalingMode: "LINEAR", scalingFactor: 1, ingredient: salmon }],
};

describe("scaling", () => {
  it("scales linear, fixed and partial lines differently", () => {
    expect(scaleLineQuantity({ quantity: 2, scalingMode: "LINEAR", scalingFactor: 1 }, 3)).toBe(6);
    expect(scaleLineQuantity({ quantity: 2, scalingMode: "FIXED", scalingFactor: 1 }, 3)).toBe(2);
    // 1 + (3 − 1) × 0.5 = 2× rather than 3×
    expect(scaleLineQuantity({ quantity: 2, scalingMode: "PARTIAL", scalingFactor: 0.5 }, 3)).toBe(4);
    // scaling down stays positive
    expect(scaleLineQuantity({ quantity: 2, scalingMode: "PARTIAL", scalingFactor: 1 }, 0.5)).toBe(1);
  });
});

describe("costing", () => {
  it("accounts for yield loss", () => {
    // $120 for 10 lb at 80% yield → $15 per usable lb
    expect(ingredientCost(salmon, 1, "lb")).toBeCloseTo(1500, 6);
  });

  it("costs volume-measured ingredients bought by weight", () => {
    // 1 cup butter ≈ 0.4752 lb × $5
    expect(ingredientCost(butter, 1, "cup")).toBeCloseTo(237.6, 0);
  });

  it("costs a recipe per portion and a dish per serving", () => {
    const perPortion = recipeCostPerPortion(seared);
    // 1.5 lb × $15 / 4 portions = $5.625
    expect(perPortion.cents).toBeCloseTo(562.5, 6);
    const dish = dishCostPerServing({
      id: "d", name: "Salmon",
      components: [{ portionsPerServing: 1, recipe: seared }, { portionsPerServing: 0.5, recipe: beurreBlanc }],
    });
    expect(dish.cents).toBeGreaterThan(562.5);
    expect(dish.unpriced).toHaveLength(0);
  });

  it("reports ingredients whose units can't be converted instead of guessing", () => {
    const r: RecipeInput = {
      id: "x", name: "Herb Oil", yieldPortions: 1,
      lines: [{ quantity: 1, unit: "bunch", scalingMode: "LINEAR", scalingFactor: 1, ingredient: shallot }],
    };
    expect(recipeCostPerPortion(r).unpriced).toEqual([{ ingredient: "Shallot", unit: "bunch" }]);
  });
});

const menu: MenuInput = {
  courses: [
    {
      id: "c1", name: "Entrée",
      items: [
        {
          id: "i1", portionsPerGuest: 1,
          dish: { id: "d1", name: "Salmon Beurre Blanc", components: [
            { portionsPerServing: 1, recipe: seared },
            { portionsPerServing: 1, recipe: beurreBlanc },
          ] },
        },
      ],
    },
    {
      id: "c2", name: "Canapés",
      items: [
        {
          id: "i2", portionsPerGuest: 2, guestCount: 6,
          dish: { id: "d2", name: "Salmon Bites", components: [{ portionsPerServing: 0.25, recipe: seared }] },
        },
      ],
    },
  ],
};

describe("menu → requirements → shopping", () => {
  it("combines the same recipe used by multiple dishes", () => {
    const req = menuRequirements(menu, 12);
    const salmonReq = req.find((r) => r.recipe.id === "sal")!;
    // 12 entrées + (6 guests × 2 bites × 0.25) = 15 portions
    expect(salmonReq.portions).toBe(15);
    expect(salmonReq.factor).toBeCloseTo(15 / 4, 6);
    expect(salmonReq.usedIn).toEqual(["Salmon Beurre Blanc", "Salmon Bites"]);
  });

  it("guest count changes flow through to quantities and cost", () => {
    const at12 = eventFoodCost(menu, 12).cents;
    const at24 = eventFoodCost(menu, 24).cents;
    expect(at24).toBeGreaterThan(at12 * 1.7);
  });

  it("builds a shopping list in purchase units with whole packages", () => {
    const list = buildShoppingList(menu, 12);
    const fish = list.find((l) => l.ingredient.id === "salmon")!;
    // 15 portions × 1.5/4 lb = 5.625 lb usable → 7.03 lb to buy at 80% yield → 1 × 10 lb case
    expect(fish.neededQty).toBeCloseTo(5.625, 6);
    expect(fish.purchaseQty).toBeCloseTo(7.03125, 4);
    expect(fish.packages).toBe(1);
    expect(fish.purchaseCostCents).toBe(12000);
    const s = list.find((l) => l.ingredient.id === "salt")!;
    expect(s.scalingNotes).toContain("Season to taste");
    const sh = list.find((l) => l.ingredient.id === "shallot")!;
    expect(sh.unit).toBe("lb");
    expect(sh.unconverted).toHaveLength(0);
  });
});

describe("shopping purchase quantities", () => {
  const tenderloin: IngredientCostInfo = {
    id: "beef", name: "Tenderloin", category: "MEAT", packageQty: 1, packageUnit: "lb", purchaseUnit: "lb",
    packagePriceCents: 1599, yieldPct: 72,
  };
  const eggs: IngredientCostInfo = {
    id: "eggs", name: "Eggs", category: "DAIRY", packageQty: 12, packageUnit: "ea", purchaseUnit: "dozen",
    packagePriceCents: 399, yieldPct: 100, isPantryStaple: false,
  };
  const r: RecipeInput = {
    id: "r", name: "Beef", yieldPortions: 8,
    lines: [
      { quantity: 3, unit: "lb", scalingMode: "LINEAR", scalingFactor: 1, ingredient: tenderloin },
      { quantity: 13, unit: "ea", scalingMode: "LINEAR", scalingFactor: 1, ingredient: eggs },
      { quantity: 1, unit: "tsp", scalingMode: "LINEAR", scalingFactor: 1, ingredient: { ...salt, isPantryStaple: true } },
    ],
  };
  const m: MenuInput = { courses: [{ id: "c", name: "Main", items: [{ id: "i", portionsPerGuest: 1, dish: { id: "d", name: "Beef", components: [{ portionsPerServing: 1, recipe: r }] } }] }] };

  it("buys loose weight items by the quarter pound and packaged items by the package", () => {
    const list = buildShoppingList(m, 8);
    const beef = list.find((l) => l.ingredient.id === "beef")!;
    // 3 lb trimmed at 72% yield = 4.17 lb → 4.25 lb
    expect(beef.soldByUnit).toBe(true);
    expect(beef.packages).toBe(4.25);
    expect(beef.purchaseCostCents).toBe(Math.round(4.25 * 1599));
    const e = list.find((l) => l.ingredient.id === "eggs")!;
    expect(e.soldByUnit).toBe(false);
    expect(e.packages).toBe(2);
  });

  it("keeps pantry staples out of the store estimate but in food cost", () => {
    const list = buildShoppingList(m, 8);
    expect(list.find((l) => l.ingredient.id === "salt")!.isPantryStaple).toBe(true);
    expect(shoppingEstimate(list)).toBe(list.filter((l) => l.ingredient.id !== "salt").reduce((s, l) => s + l.purchaseCostCents, 0));
    expect(eventFoodCost(m, 8).cents).toBeGreaterThan(0);
  });
});
