/**
 * Planning: drafts a prep plan and a day-of timeline from the menu. Drafts are saved as normal
 * records that you then own: reorder, reassign, rename. Regenerating only adds what's missing.
 */

import { minutesOf, timeFromMinutes } from "./dates";
import type { RecipeRequirement } from "./culinary";
import { formatNumber } from "./units";

export type PrepPhase = "SEVERAL_DAYS" | "TWO_DAYS" | "DAY_BEFORE" | "EVENT_MORNING" | "BEFORE_DEPARTURE" | "ON_SITE";

export const PREP_PHASES: { key: PrepPhase; label: string; offsetDays: number | null }[] = [
  { key: "SEVERAL_DAYS", label: "Several Days Before", offsetDays: -3 },
  { key: "TWO_DAYS", label: "Two Days Before", offsetDays: -2 },
  { key: "DAY_BEFORE", label: "Day Before", offsetDays: -1 },
  { key: "EVENT_MORNING", label: "Event Morning", offsetDays: 0 },
  { key: "BEFORE_DEPARTURE", label: "Before Departure", offsetDays: 0 },
  { key: "ON_SITE", label: "On-Site", offsetDays: 0 },
];

export interface DraftPrepTask {
  title: string;
  phase: PrepPhase;
  recipeId?: string;
  dishId?: string;
  estimatedMinutes: number | null;
}

export interface PlanningRecipe {
  id: string;
  name: string;
  defaultPrepPhase: PrepPhase;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  yieldDescription?: string | null;
}

/**
 * Time grows slower than volume: doubling a sauce doesn't double the chopping-board setup.
 * minutes × (1 + 0.6 × (factor − 1)), never less than the base time × 0.6.
 */
export function scaledMinutes(base: number | null | undefined, factor: number): number | null {
  if (!base) return null;
  const m = base * Math.max(0.6, 1 + 0.6 * (factor - 1));
  return Math.round(m / 5) * 5;
}

export function draftPrepTasks(
  requirements: (RecipeRequirement & { recipe: RecipeRequirement["recipe"] & PlanningRecipe })[],
  dishes: { id: string; name: string }[],
  existing: { recipeId?: string | null; dishId?: string | null; generated: boolean }[],
): DraftPrepTask[] {
  const haveRecipe = new Set(existing.filter((t) => t.generated && t.recipeId).map((t) => t.recipeId));
  const haveDish = new Set(existing.filter((t) => t.generated && t.dishId).map((t) => t.dishId));
  const drafts: DraftPrepTask[] = [];

  for (const req of requirements) {
    if (haveRecipe.has(req.recipe.id)) continue;
    const base = (req.recipe.prepMinutes ?? 0) + (req.recipe.cookMinutes ?? 0);
    drafts.push({
      title: `${req.recipe.name} — ${formatNumber(req.portions)} portions`,
      phase: req.recipe.defaultPrepPhase,
      recipeId: req.recipe.id,
      estimatedMinutes: scaledMinutes(base || null, req.factor),
    });
  }
  for (const d of dishes) {
    if (haveDish.has(d.id)) continue;
    drafts.push({ title: `Plate & garnish: ${d.name}`, phase: "ON_SITE", dishId: d.id, estimatedMinutes: null });
  }
  return drafts;
}

export interface DraftRunItem {
  time: string;
  title: string;
  kind: "ARRIVAL" | "TASK" | "FIRE" | "SERVICE" | "BREAKDOWN" | "DEPARTURE";
  details: string;
}

/**
 * A starting day-of timeline built from arrival time, service time, course fire times
 * and staff call times.
 */
export function draftRunOfShow(input: {
  arrivalTime?: string | null;
  serviceTime?: string | null;
  endTime?: string | null;
  courses: { name: string; fireTime?: string | null; dishes: string[] }[];
}): DraftRunItem[] {
  const service = minutesOf(input.serviceTime ?? "") ?? 19 * 60;
  const arrival = minutesOf(input.arrivalTime ?? "") ?? service - 150;
  const items: DraftRunItem[] = [
    {
      time: timeFromMinutes(arrival), title: "Arrive & load in", kind: "ARRIVAL",
      details: ["Unload vehicle", "Refrigerate proteins & seafood", "Preheat oven", "Set up prep station", "Walk the space with host"].join("\n"),
    },
    {
      time: timeFromMinutes(arrival + 30), title: "Mise en place check", kind: "TASK",
      details: ["Verify every component is on site", "Stage sauces & garnishes", "Set up plating line"].join("\n"),
    },
  ];
  let cursor = service;
  input.courses.forEach((c, i) => {
    const t = minutesOf(c.fireTime ?? "") ?? cursor;
    items.push({
      time: timeFromMinutes(t - 15), title: `Fire ${c.name}`, kind: "FIRE",
      details: c.dishes.map((d) => `Fire ${d}`).join("\n"),
    });
    items.push({ time: timeFromMinutes(t), title: `Serve ${c.name}`, kind: "SERVICE", details: c.dishes.join("\n") });
    cursor = t + (i === 0 ? 25 : 30);
  });
  const end = minutesOf(input.endTime ?? "") ?? cursor + 30;
  items.push({
    time: timeFromMinutes(Math.max(cursor, end - 45)), title: "Breakdown & clean", kind: "BREAKDOWN",
    details: ["Package leftovers for host", "Clean kitchen to better than found", "Pack equipment against list"].join("\n"),
  });
  items.push({ time: timeFromMinutes(end), title: "Depart", kind: "DEPARTURE", details: "Final walk-through with host" });
  return items;
}
