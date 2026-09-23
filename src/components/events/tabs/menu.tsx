import Link from "next/link";
import { FileText } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { db } from "@/lib/server/db";
import { dishInclude, toDishInput } from "@/lib/mappers";
import { dishCostPerServing } from "@/lib/domain/culinary";
import { formatMoney } from "@/lib/domain/money";
import { MenuBuilder, type BuilderCourse, type LibraryDish } from "@/components/menu/menu-builder";
import { MenuStatusControl } from "@/components/menu/menu-status";
import { Card, CardBody } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

/** Does a guest restriction ("Tree nuts") collide with a dish allergen ("Tree Nuts")? */
function collides(restriction: string, allergen: string) {
  const a = restriction.toLowerCase().replace(/s\b/g, "");
  const b = allergen.toLowerCase().replace(/s\b/g, "");
  return a.includes(b) || b.includes(a);
}

export async function MenuTab({ ws }: { ws: WS }) {
  const { event: e, summary: s } = ws;
  const [library, recipes] = await Promise.all([
    db.dish.findMany({ where: { archived: false, inLibrary: true }, include: dishInclude, orderBy: { name: "asc" } }),
    db.recipe.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const restrictions = [
    ...e.guestNotes.filter((g) => g.severity !== "PREFERENCE").map((g) => ({ label: g.restriction, who: g.guestName ?? `${g.count} guest${g.count > 1 ? "s" : ""}` })),
  ];

  const courses: BuilderCourse[] = (e.menu?.courses ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    fireTime: c.fireTime,
    items: c.items.map((i) => {
      const cost = dishCostPerServing(toDishInput(i.dish));
      const servings = (i.guestCount ?? e.guestCount) * i.portionsPerGuest;
      const conflicts = restrictions.filter((r) => i.dish.allergens.some((a) => collides(r.label, a))).map((r) => `${r.label} (${r.who})`);
      return {
        id: i.id,
        dishId: i.dish.id,
        name: i.dish.name,
        description: i.dish.description,
        allergens: i.dish.allergens,
        dietaryTags: i.dish.dietaryTags,
        guestCount: i.guestCount,
        portionsPerGuest: i.portionsPerGuest,
        notes: i.notes,
        costPerServingCents: Math.round(cost.cents),
        servings,
        totalCents: Math.round(cost.cents * servings),
        componentCount: i.dish.components.length,
        inLibrary: i.dish.inLibrary,
        conflicts,
      };
    }),
  }));

  const dishes: LibraryDish[] = library.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    course: d.course,
    protein: d.protein,
    dietaryTags: d.dietaryTags,
    allergens: d.allergens,
    costPerServingCents: Math.round(dishCostPerServing(toDishInput(d)).cents),
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <div className="min-w-0">
        <MenuBuilder menuId={e.menu?.id ?? null} eventId={e.id} guestCount={e.guestCount} courses={courses} library={dishes} recipes={recipes} />
      </div>
      <aside className="space-y-4">
        <Card>
          <CardBody className="space-y-4 pt-5">
            <MenuStatusControl eventId={e.id} status={e.menu?.status ?? "DRAFT"} />
            <Link href={`/events/${e.id}/menu-card`} target="_blank" className={buttonClass("secondary", "md", "w-full")}>
              <FileText className="h-4 w-4" />Client-facing menu
            </Link>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3 pt-5">
            <div className="eyebrow">Food cost</div>
            <div className="font-display text-[2.2rem] leading-none tabular">{formatMoney(s.foodCost.cents)}</div>
            <div className="text-sm text-ink-3">
              {formatMoney(s.projection.foodCostPerGuestCents)} per guest
              {s.projection.foodCostPct !== null && <> · {s.projection.foodCostPct.toFixed(0)}% of price</>}
            </div>
            {s.foodCost.unpriced.length > 0 && (
              <p className="rounded-xl bg-amber-soft px-3 py-2 text-xs text-amber">
                Not costed (unit can’t be converted): {s.foodCost.unpriced.map((u) => `${u.ingredient} (${u.unit})`).join(", ")}. Add a weight per unit on the ingredient.
              </p>
            )}
            <p className="text-xs text-ink-4">Recalculates automatically when the guest count, a dish, a recipe or an ingredient price changes.</p>
          </CardBody>
        </Card>
        {restrictions.length > 0 && (
          <Card>
            <CardBody className="pt-5">
              <div className="eyebrow mb-2">Checking against</div>
              <ul className="space-y-1 text-sm text-ink-2">
                {restrictions.map((r, i) => <li key={i}>• {r.label} <span className="text-ink-3">— {r.who}</span></li>)}
              </ul>
            </CardBody>
          </Card>
        )}
      </aside>
    </div>
  );
}
