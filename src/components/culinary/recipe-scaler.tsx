"use client";

import { useState } from "react";
import { Info, Pencil, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { recipeBatchCost, scaleLineQuantity, type IngredientCostInfo, type ScalingMode } from "@/lib/domain/culinary";
import { formatMoney } from "@/lib/domain/money";
import { formatNumber, formatQuantity, COMMON_UNITS } from "@/lib/domain/units";
import { SCALING_MODE } from "@/lib/status";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { removeRecipeLine, saveRecipeLine } from "@/app/(app)/recipes/actions";

export interface ScalerLine {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  prepNote: string | null;
  scalingMode: ScalingMode;
  scalingFactor: number;
  scalingNote: string | null;
  ingredient: IngredientCostInfo;
}

const PRESETS = [12, 20, 50, 100];

function LineFields({ line, ingredients }: { line?: ScalerLine; ingredients: { id: string; name: string }[] }) {
  return (
    <>
      <Field label="Ingredient" name="ingredientId">
        <Select id="ingredientId" name="ingredientId" required defaultValue={line?.ingredientId ?? ""}>
          <option value="" disabled>Choose…</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </Select>
      </Field>
      <FormGrid className="sm:grid-cols-3">
        <Field label="Quantity" name="quantity"><Input id="quantity" name="quantity" inputMode="decimal" required defaultValue={line?.quantity ?? ""} /></Field>
        <Field label="Unit" name="unit"><Input id="unit" name="unit" required defaultValue={line?.unit ?? ""} list="line-units" placeholder="cup, oz, ea…" /></Field>
        <Field label="Prep note" name="prepNote"><Input id="prepNote" name="prepNote" defaultValue={line?.prepNote ?? ""} placeholder="minced" /></Field>
      </FormGrid>
      <datalist id="line-units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="rounded-2xl bg-sand/50 p-4">
        <div className="mb-3 text-[0.8125rem] text-ink-2">How does this scale when the batch grows?</div>
        <FormGrid>
          <Field label="Scaling" name="scalingMode">
            <Select id="scalingMode" name="scalingMode" defaultValue={line?.scalingMode ?? "LINEAR"}>
              <option value="LINEAR">Scales normally</option>
              <option value="PARTIAL">Partially — salt, spice, oil</option>
              <option value="FIXED">Fixed — same amount at any size</option>
            </Select>
          </Field>
          <Field label="Partial rate %" name="scalingPct" hint="of normal growth"><Input id="scalingPct" name="scalingPct" inputMode="decimal" defaultValue={Math.round((line?.scalingFactor ?? 0.7) * 100)} /></Field>
        </FormGrid>
        <Field label="Scaling note" name="scalingNote" className="mt-3"><Input id="scalingNote" name="scalingNote" defaultValue={line?.scalingNote ?? ""} placeholder="Season to taste at large batch sizes" /></Field>
      </div>
    </>
  );
}

export function RecipeScaler({
  recipeId, recipeName, yieldPortions, yieldDescription, lines, ingredients,
}: {
  recipeId: string;
  recipeName: string;
  yieldPortions: number;
  yieldDescription: string | null;
  lines: ScalerLine[];
  ingredients: { id: string; name: string }[];
}) {
  const [target, setTarget] = useState(String(yieldPortions));
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const portions = Number(target) > 0 ? Number(target) : yieldPortions;
  const factor = portions / yieldPortions;
  const cost = recipeBatchCost({ id: recipeId, name: recipeName, yieldPortions, lines }, factor);
  const scaled = factor !== 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="target" className="mb-1.5 block text-[0.8125rem] font-medium text-ink-2">Make for</label>
          <div className="flex items-center gap-2">
            <input id="target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="h-12 w-24 rounded-xl border border-line-strong/60 bg-white/80 text-center font-display text-2xl tabular focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10" />
            <span className="text-sm text-ink-3">portions</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[yieldPortions, ...PRESETS.filter((p) => p !== yieldPortions)].map((p) => (
            <button key={p} type="button" onClick={() => setTarget(String(p))} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium", Number(target) === p ? "border-espresso bg-espresso text-linen" : "border-line text-ink-2 hover:border-line-strong")}>
              {p === yieldPortions ? `${formatNumber(p)} (base)` : p}
            </button>
          ))}
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-ink-3">{scaled ? `×${formatNumber(factor)} batch` : yieldDescription ?? "one batch"}</div>
          <div className="font-display text-2xl tabular">{formatMoney(Math.round(cost.cents))}</div>
          <div className="text-xs text-ink-3">{formatMoney(Math.round(cost.cents / portions), { exact: true })} per portion</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line/70">
        <table className="w-full text-sm">
          <thead className="bg-sand/50 text-xs text-ink-3">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Ingredient</th>
              <th className="px-4 py-2 text-right font-medium">{scaled ? `For ${formatNumber(portions)}` : "Amount"}</th>
              <th className="w-24 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 bg-linen">
            {lines.map((l) => {
              const q = scaleLineQuantity(l, factor);
              const ov = overrides[l.id];
              return (
                <tr key={l.id} className="group align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{l.ingredient.name}{l.prepNote && <span className="font-normal text-ink-3">, {l.prepNote}</span>}</div>
                    {l.scalingMode !== "LINEAR" && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-amber">
                        <Info className="h-3 w-3" />
                        {SCALING_MODE[l.scalingMode]}{l.scalingMode === "PARTIAL" ? ` (${Math.round(l.scalingFactor * 100)}%)` : ""}{l.scalingNote ? ` — ${l.scalingNote}` : ""}
                      </div>
                    )}
                    {scaled && <div className="text-xs text-ink-4">base: {formatQuantity(l.quantity, l.unit, { humanize: false })}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ov !== undefined ? (
                      <div className="flex items-center justify-end gap-1">
                        <input value={ov} onChange={(e) => setOverrides((o) => ({ ...o, [l.id]: e.target.value }))} className="h-8 w-32 rounded-lg border border-champagne/60 bg-champagne-soft/40 px-2 text-right text-sm focus:outline-none" aria-label="Manual quantity" />
                        <button type="button" onClick={() => setOverrides(({ [l.id]: _, ...rest }) => rest)} className="rounded p-1 text-ink-4 hover:text-ink" aria-label="Reset to calculated"><RotateCcw className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setOverrides((o) => ({ ...o, [l.id]: formatQuantity(q, l.unit) }))} title="Tap to override by hand" className="font-display text-lg tabular text-ink hover:text-wine">
                        {formatQuantity(q, l.unit)}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex justify-end opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <ActionDialog trigger={<Pencil className="h-3.5 w-3.5" />} triggerLabel="Edit line" triggerVariant="ghost" triggerSize="icon" title={`Edit ${l.ingredient.name}`} action={saveRecipeLine} hidden={{ lineId: l.id }}>
                        <LineFields line={l} ingredients={ingredients} />
                      </ActionDialog>
                      <RemoveButton action={removeRecipeLine.bind(null, l.id)} label={`Remove ${l.ingredient.name}`} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {lines.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-3">No ingredients yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <ActionDialog trigger={<><Plus className="h-4 w-4" />Add ingredient</>} triggerSize="sm" triggerVariant="quiet" title="Add ingredient" action={saveRecipeLine} hidden={{ recipeId }}>
          <LineFields ingredients={ingredients} />
        </ActionDialog>
        {Object.keys(overrides).length > 0 && <span className="text-xs text-ink-3">Manual overrides are for this screen only.</span>}
        {cost.unpriced.length > 0 && <span className="text-xs text-amber">Not costed: {cost.unpriced.map((u) => `${u.ingredient} (${u.unit})`).join(", ")}</span>}
      </div>
    </div>
  );
}
