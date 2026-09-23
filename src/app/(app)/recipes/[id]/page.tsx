import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Flame, Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/server/db";
import { recipeInclude, toIngredientInfo } from "@/lib/mappers";
import { PREP_PHASE, RECIPE_CATEGORY } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { RecipeFields } from "@/components/culinary/recipe-fields";
import { RecipeScaler } from "@/components/culinary/recipe-scaler";
import { PrintButton } from "@/components/ui/print-button";
import { deleteRecipe, updateRecipe } from "../actions";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const r = await db.recipe.findUnique({ where: { id }, select: { name: true } });
  return { title: r?.name ?? "Recipe" };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const [r, ingredients] = await Promise.all([
    db.recipe.findUnique({ where: { id }, include: { ...recipeInclude, dishComponents: { include: { dish: { select: { id: true, name: true, inLibrary: true } } } } } }),
    db.ingredient.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!r) notFound();
  const steps = (r.method ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  const notes: [string, string | null][] = [
    ["Holding", r.holdingInstructions], ["Reheating", r.reheatingInstructions], ["Transport", r.transportNotes], ["Plating", r.platingInstructions],
  ];

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-up">
          <div className="eyebrow mb-2"><Link href="/recipes" className="hover:text-wine">Recipes</Link> · {RECIPE_CATEGORY[r.category]}</div>
          <h1 className="font-display text-[2.2rem] leading-tight sm:text-[2.7rem]">{r.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2">
            <span>Yields {r.yieldPortions} portions{r.yieldDescription ? ` · ${r.yieldDescription}` : ""}</span>
            {(r.prepMinutes || r.cookMinutes) && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-ink-4" />{r.prepMinutes ?? 0}m prep · {r.cookMinutes ?? 0}m cook</span>}
            <span className="flex items-center gap-1.5"><Flame className="h-4 w-4 text-ink-4" />Usually {PREP_PHASE[r.defaultPrepPhase].toLowerCase()}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.allergens.map((a) => <Badge key={a} tone="clay" size="xs">{a}</Badge>)}
            {r.dietaryTags.map((t) => <Badge key={t} tone="sage" size="xs">{t}</Badge>)}
          </div>
        </div>
        <div className="no-print flex gap-2">
          <PrintButton label="Print" />
          <ActionDialog trigger={<><Pencil className="h-4 w-4" />Edit</>} title="Edit recipe" action={updateRecipe} hidden={{ id }} wide>
            <RecipeFields r={r} />
          </ActionDialog>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="min-w-0">
          <CardHeader eyebrow="Scale it" title="Ingredients" description="Tap any amount to override it by hand." />
          <CardBody>
            <RecipeScaler
              recipeId={r.id}
              recipeName={r.name}
              yieldPortions={r.yieldPortions}
              yieldDescription={r.yieldDescription}
              ingredients={ingredients}
              lines={r.ingredients.map((l) => ({
                id: l.id, ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit, prepNote: l.prepNote,
                scalingMode: l.scalingMode, scalingFactor: l.scalingFactor, scalingNote: l.scalingNote, ingredient: toIngredientInfo(l.ingredient),
              }))}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Method" />
            <CardBody>
              {steps.length ? (
                <ol className="space-y-3">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand font-display text-base text-ink-2">{i + 1}</span>
                      <p className="pt-0.5 text-[0.9375rem] leading-relaxed text-ink">{s}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-ink-4">No method written yet.</p>}
              {r.equipment && <p className="mt-4 border-t border-line pt-3 text-sm text-ink-2"><span className="text-ink-3">Equipment:</span> {r.equipment}</p>}
            </CardBody>
          </Card>
          {notes.some(([, v]) => v) && (
            <Card>
              <CardBody className="grid gap-4 pt-5 sm:grid-cols-2">
                {notes.filter(([, v]) => v).map(([k, v]) => (
                  <div key={k}><div className="eyebrow mb-1">{k}</div><p className="text-sm text-ink-2">{v}</p></div>
                ))}
              </CardBody>
            </Card>
          )}
          {r.chefNotes && <Card className="bg-champagne-soft/50"><CardBody className="pt-5"><div className="eyebrow mb-1">Chef notes</div><p className="text-sm text-ink">{r.chefNotes}</p></CardBody></Card>}
          <Card>
            <CardHeader title="Used in" />
            <CardBody>
              {r.dishComponents.length ? (
                <ul className="space-y-1.5 text-sm">{r.dishComponents.map((c) => <li key={c.id}><Link href={`/dishes/${c.dish.id}`} className="text-ink hover:text-wine">{c.dish.name}</Link>{!c.dish.inLibrary && <span className="text-xs text-ink-4"> · custom</span>}</li>)}</ul>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-4">Not used in any dish.</p>
                  <ConfirmButton action={deleteRecipe.bind(null, r.id)} label="Delete recipe" confirmLabel="Delete" icon={<Trash2 className="h-4 w-4" />} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
