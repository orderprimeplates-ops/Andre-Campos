import Link from "next/link";
import { Clock, Plus, Search } from "lucide-react";
import { db } from "@/lib/server/db";
import { recipeInclude, toRecipeInput } from "@/lib/mappers";
import { recipeCostPerPortion } from "@/lib/domain/culinary";
import { formatMoney } from "@/lib/domain/money";
import { RECIPE_CATEGORY } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Recipes" };

export default async function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const recipes = await db.recipe.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { ingredients: { some: { ingredient: { name: { contains: q, mode: "insensitive" } } } } }] } : {},
    include: { ...recipeInclude, _count: { select: { dishComponents: true } } },
    orderBy: { name: "asc" },
  });
  const cats = Object.keys(RECIPE_CATEGORY).filter((c) => recipes.some((r) => r.category === c));
  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Recipes"
        description="The components you cook. Dishes are built from these; costs update with ingredient prices."
        actions={<ButtonLink href="/recipes/new" variant="primary"><Plus className="h-4 w-4" />New recipe</ButtonLink>}
      />
      <form className="relative mb-6 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input name="q" defaultValue={q} placeholder="Search recipes or ingredients…" className="h-11 w-full rounded-xl border border-line-strong/60 bg-white/70 pl-10 pr-3 text-[0.9375rem] placeholder:text-ink-4 focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10" />
      </form>
      <div className="space-y-7">
        {cats.map((c) => (
          <section key={c}>
            <h2 className="eyebrow mb-2 px-1 text-ink-2">{RECIPE_CATEGORY[c]}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recipes.filter((r) => r.category === c).map((r) => {
                const cost = recipeCostPerPortion(toRecipeInput(r));
                return (
                  <Link key={r.id} href={`/recipes/${r.id}`}>
                    <Card className="h-full p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                      <div className="font-display text-[1.25rem] leading-snug">{r.name}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-3">
                        <span>{r.yieldPortions} portions</span>
                        <span>{r.ingredients.length} ingredients</span>
                        {(r.prepMinutes || r.cookMinutes) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(r.prepMinutes ?? 0) + (r.cookMinutes ?? 0)}m</span>}
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-xs text-ink-4">{r._count.dishComponents ? `in ${r._count.dishComponents} dish${r._count.dishComponents > 1 ? "es" : ""}` : "not in a dish"}</span>
                        <span className="text-right"><span className="font-display text-lg tabular">{formatMoney(Math.round(cost.cents), { exact: true })}</span><span className="text-xs text-ink-3"> / portion</span></span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        {recipes.length === 0 && <p className="py-10 text-center text-ink-3">No recipes match.</p>}
      </div>
    </div>
  );
}
