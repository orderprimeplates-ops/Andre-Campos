import { Plus, Search } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { costPerUsablePackageUnit } from "@/lib/domain/culinary";
import { daysBetween, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { formatNumber, unitLabel } from "@/lib/domain/units";
import { INGREDIENT_CATEGORY, INGREDIENT_CATEGORY_ORDER } from "@/lib/status";
import { toIngredientInfo } from "@/lib/mappers";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ActionDialog } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { IngredientFields } from "@/components/culinary/ingredient-fields";
import { deleteIngredient, saveIngredient } from "./actions";

export const metadata = { title: "Ingredients" };

export default async function IngredientsPage({ searchParams }: PageProps<"/ingredients">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const cat = typeof sp.category === "string" && INGREDIENT_CATEGORY[sp.category] ? sp.category : "";
  const focus = typeof sp.focus === "string" ? sp.focus : "";
  const { today } = await getToday();
  const [ingredients, vendors] = await Promise.all([
    db.ingredient.findMany({
      where: { ...(q ? { name: { contains: q, mode: "insensitive" } } : {}), ...(cat ? { category: cat as never } : {}) },
      include: { preferredVendor: true, _count: { select: { recipeLines: true } } },
      orderBy: { name: "asc" },
    }),
    db.vendor.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  const groups = INGREDIENT_CATEGORY_ORDER.filter((c) => ingredients.some((i) => i.category === c));
  const stale = ingredients.filter((i) => daysBetween(toISODate(i.priceUpdatedAt), today) > 60).length;

  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Ingredients & costs"
        description={`${ingredients.length} ingredients. Update a price here and every recipe, dish and event using it recalculates.${stale ? ` ${stale} prices haven’t been checked in 60+ days.` : ""}`}
        actions={
          <ActionDialog trigger={<><Plus className="h-4 w-4" />Ingredient</>} triggerVariant="primary" title="New ingredient" action={saveIngredient} wide>
            <IngredientFields vendors={vendors} />
          </ActionDialog>
        }
      />
      <form className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder="Search ingredients…" className="h-11 w-full rounded-xl border border-line-strong/60 bg-white/70 pl-10 pr-3 text-[0.9375rem] placeholder:text-ink-4 focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10" />
        </div>
        <select name="category" defaultValue={cat} className="h-11 rounded-xl border border-line-strong/60 bg-white/70 px-3.5 text-sm">
          <option value="">All categories</option>
          {Object.entries(INGREDIENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-sand px-4 text-sm font-medium text-ink-2 hover:bg-parchment">Filter</button>
      </form>

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g}>
            <h2 className="eyebrow mb-2 px-1 text-ink-2">{INGREDIENT_CATEGORY[g]}</h2>
            <Card className="overflow-hidden">
              <div className="hidden grid-cols-[1.6fr_1.2fr_1fr_0.7fr_1fr] gap-4 border-b border-line bg-sand/40 px-5 py-2 text-xs text-ink-3 md:grid">
                <span>Ingredient</span><span>Buy</span><span>Usable cost</span><span>Yield</span><span>Store</span>
              </div>
              {ingredients.filter((i) => i.category === g).map((i) => {
                const unitCost = costPerUsablePackageUnit(toIngredientInfo(i));
                const age = daysBetween(toISODate(i.priceUpdatedAt), today);
                return (
                  <ActionDialog
                    key={i.id}
                    trigger={
                      <div className={cn("grid w-full grid-cols-2 gap-x-4 gap-y-1 px-5 py-3 text-left text-sm md:grid-cols-[1.6fr_1.2fr_1fr_0.7fr_1fr] md:items-center", focus === i.id && "bg-champagne-soft/60")}>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{i.name}</span>
                          <span className="text-xs text-ink-3">
                            {i._count.recipeLines ? `in ${i._count.recipeLines} recipe${i._count.recipeLines > 1 ? "s" : ""}` : "unused"}
                            {i.isPantryStaple && " · pantry"}
                          </span>
                        </span>
                        <span className="text-right text-ink-2 md:text-left">
                          <span className="tabular">{formatMoney(i.packagePriceCents, { exact: true })}</span> <span className="text-ink-3">/ {i.purchaseUnit}</span>
                          {age > 60 && <span className="block text-[0.6875rem] text-amber">price {age}d old</span>}
                        </span>
                        <span className="tabular text-ink">{formatMoney(Math.round(unitCost), { exact: true })}<span className="text-ink-3">/{unitLabel(i.packageUnit)}</span></span>
                        <span className={cn("tabular", i.yieldPct < 100 ? "text-ink-2" : "text-ink-4")}>{formatNumber(i.yieldPct, false)}%</span>
                        <span className="hidden truncate text-ink-3 md:block">{i.preferredVendor?.name ?? "—"}</span>
                      </div>
                    }
                    triggerClassName="block w-full border-b border-line/60 transition-colors last:border-0 hover:bg-sand/40"
                    title={i.name}
                    description="Price changes flow instantly into recipes, dishes and events."
                    action={saveIngredient}
                    hidden={{ id: i.id }}
                    wide
                  >
                    <IngredientFields i={i} vendors={vendors} />
                    {i._count.recipeLines === 0 && <ConfirmButton action={deleteIngredient.bind(null, i.id)} label="Delete ingredient" confirmLabel="Delete" />}
                  </ActionDialog>
                );
              })}
            </Card>
          </section>
        ))}
        {ingredients.length === 0 && <p className="py-10 text-center text-ink-3">No ingredients match.</p>}
      </div>
    </div>
  );
}
