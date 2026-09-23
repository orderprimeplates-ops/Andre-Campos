import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ImagePlus, Pencil, Plus } from "lucide-react";
import { db } from "@/lib/server/db";
import { dishInclude, toDishInput, toRecipeInput } from "@/lib/mappers";
import { dishCostPerServing, recipeCostPerPortion } from "@/lib/domain/culinary";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { COURSE, HOLDING, LEVEL, SERVICE_STYLE, metaOf } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { DishFields } from "@/components/culinary/dish-fields";
import { ToggleActionButton } from "@/components/ui/toggle-action-button";
import { addComponent, archiveDish, removeComponent, updateComponent, updateDish } from "../actions";

export async function generateMetadata({ params }: PageProps<"/dishes/[id]">) {
  const { id } = await params;
  const d = await db.dish.findUnique({ where: { id }, select: { name: true } });
  return { title: d?.name ?? "Dish" };
}

export default async function DishPage({ params }: PageProps<"/dishes/[id]">) {
  const { id } = await params;
  const [d, recipes, uses] = await Promise.all([
    db.dish.findUnique({ where: { id }, include: dishInclude }),
    db.recipe.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.menuItem.findMany({
      where: { dishId: id },
      include: { course: { include: { menu: { include: { event: { select: { id: true, name: true, date: true, review: { select: { serveMenuAgain: true, clientLoved: true } } } } } } } } },
      orderBy: { course: { menu: { event: { date: "desc" } } } },
      take: 20,
    }),
  ]);
  if (!d) notFound();
  const cost = dishCostPerServing(toDishInput(d));
  const hold = metaOf(HOLDING, d.holdingQuality);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl animate-fade-up">
          <div className="eyebrow mb-2"><Link href="/dishes" className="hover:text-wine">Dish Library</Link> · {COURSE[d.course]}{d.archived ? " · archived" : ""}</div>
          <h1 className="font-display text-[2.2rem] leading-tight sm:text-[2.8rem]">{d.name}</h1>
          {d.description && <p className="mt-2 font-display text-xl italic text-ink-2">{d.description}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.dietaryTags.map((t) => <Badge key={t} tone="sage" size="xs">{t}</Badge>)}
            {d.allergens.map((a) => <Badge key={a} tone="clay" size="xs">{a}</Badge>)}
          </div>
        </div>
        <div className="flex gap-2">
          <ToggleActionButton action={archiveDish.bind(null, d.id, !d.archived)} icon={d.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />} label={d.archived ? "Restore" : "Archive"} />
          <ActionDialog trigger={<><Pencil className="h-4 w-4" />Edit</>} title="Edit dish" action={updateDish} hidden={{ id }} wide>
            <DishFields d={d} withLibraryToggle />
          </ActionDialog>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              eyebrow="On the plate"
              title="Components"
              description="Each component is a recipe; portions per plate drive scaling, shopping and cost."
              action={
                <ActionDialog trigger={<><Plus className="h-4 w-4" />Component</>} triggerSize="sm" triggerVariant="primary" title="Add a component" action={addComponent} hidden={{ dishId: d.id }}>
                  <Field label="Recipe" name="recipeId">
                    <Select id="recipeId" name="recipeId" required defaultValue=""><option value="" disabled>Choose a recipe…</option>{recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
                  </Field>
                  <FormGrid>
                    <Field label="Recipe portions per plate" name="portionsPerServing" hint="usually 1"><Input id="portionsPerServing" name="portionsPerServing" inputMode="decimal" defaultValue={1} /></Field>
                    <Field label="Note" name="notes"><Input id="notes" name="notes" /></Field>
                  </FormGrid>
                </ActionDialog>
              }
            />
            <CardBody>
              <ul className="divide-y divide-line/70">
                {d.components.map((c) => {
                  const rc = recipeCostPerPortion(toRecipeInput(c.recipe));
                  return (
                    <li key={c.id} className="group flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/recipes/${c.recipe.id}`} className="font-medium text-ink hover:text-wine">{c.recipe.name}</Link>
                        <div className="text-xs text-ink-3">{c.portionsPerServing} portion{c.portionsPerServing === 1 ? "" : "s"} per plate · {formatMoney(Math.round(rc.cents), { exact: true })} per portion{c.notes ? ` · ${c.notes}` : ""}</div>
                      </div>
                      <span className="tabular text-sm">{formatMoney(Math.round(rc.cents * c.portionsPerServing), { exact: true })}</span>
                      <ActionDialog trigger={<Pencil className="h-3.5 w-3.5" />} triggerLabel="Edit" triggerVariant="ghost" triggerSize="icon" title={c.recipe.name} action={updateComponent} hidden={{ id: c.id }}>
                        <FormGrid>
                          <Field label="Recipe portions per plate" name="portionsPerServing"><Input id="portionsPerServing" name="portionsPerServing" inputMode="decimal" defaultValue={c.portionsPerServing} /></Field>
                          <Field label="Note" name="notes"><Input id="notes" name="notes" defaultValue={c.notes ?? ""} /></Field>
                        </FormGrid>
                      </ActionDialog>
                      <RemoveButton action={removeComponent.bind(null, c.id)} label="Remove component" />
                    </li>
                  );
                })}
                {d.components.length === 0 && <li className="py-6 text-center text-sm text-ink-3">No recipes linked yet — add components so this dish flows into shopping, prep and cost.</li>}
              </ul>
              <div className="mt-2 flex justify-between border-t border-line pt-3 font-medium"><span>Food cost per plate</span><span className="font-display text-xl tabular">{formatMoney(Math.round(cost.cents), { exact: true })}</span></div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Served at" />
            <CardBody>
              {uses.length === 0 ? <p className="text-sm text-ink-4">Not on any event menu yet.</p> : (
                <ul className="divide-y divide-line/70">
                  {uses.map((u) => {
                    const ev = u.course.menu.event;
                    return (
                      <li key={u.id} className="py-2.5 text-sm">
                        <Link href={`/events/${ev.id}?tab=menu`} className="font-medium hover:text-wine">{ev.name}</Link>
                        <span className="text-ink-3"> · {formatDate.medium(toISODate(ev.date))}</span>
                        {ev.review?.clientLoved && <p className="mt-0.5 text-xs italic text-ink-2">“{ev.review.clientLoved}”</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardBody className="grid grid-cols-2 gap-4 pt-5 text-sm">
              {[
                ["Cuisine", d.cuisine], ["Protein", d.protein], ["Difficulty", LEVEL[d.difficulty]], ["Prep intensity", LEVEL[d.prepIntensity]],
                ["Plating", LEVEL[d.platingDifficulty]], ["Holding", hold.label],
              ].map(([k, v]) => <div key={k}><div className="text-xs text-ink-3">{k}</div><div className="text-ink">{v ?? "—"}</div></div>)}
              <div className="col-span-2">
                <div className="text-xs text-ink-3">Suits</div>
                <div className="mt-1 flex flex-wrap gap-1.5">{d.serviceStyles.map((s) => <Badge key={s} size="xs">{SERVICE_STYLE[s]}</Badge>)}{d.serviceStyles.length === 0 && <span className="text-ink-4">—</span>}</div>
              </div>
            </CardBody>
          </Card>
          {d.chefNotes && <Card className="bg-champagne-soft/50"><CardBody className="pt-5"><div className="eyebrow mb-1">Chef notes</div><p className="text-sm">{d.chefNotes}</p></CardBody></Card>}
          <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong/60 px-4 py-3 text-xs text-ink-3">
            <ImagePlus className="h-4 w-4 shrink-0" />Plating photos arrive once file storage is connected.
          </div>
        </aside>
      </div>
    </div>
  );
}
