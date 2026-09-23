import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { PREP_PHASE, PREP_PHASE_ORDER, RECIPE_CATEGORY } from "@/lib/status";

interface R {
  name?: string; category?: string; yieldPortions?: number; yieldDescription?: string | null; method?: string | null;
  prepMinutes?: number | null; cookMinutes?: number | null; equipment?: string | null; allergens?: string[]; dietaryTags?: string[];
  holdingInstructions?: string | null; reheatingInstructions?: string | null; transportNotes?: string | null;
  platingInstructions?: string | null; chefNotes?: string | null; defaultPrepPhase?: string;
}

export function RecipeFields({ r = {} }: { r?: R }) {
  return (
    <div className="space-y-6">
      <FormGrid>
        <Field label="Recipe name" name="name"><Input id="name" name="name" required defaultValue={r.name} /></Field>
        <Field label="Category" name="category">
          <Select id="category" name="category" defaultValue={r.category ?? "SAUCE"}>{Object.entries(RECIPE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Yield (portions)" name="yieldPortions" hint="one batch makes"><Input id="yieldPortions" name="yieldPortions" inputMode="decimal" required defaultValue={r.yieldPortions ?? 8} /></Field>
        <Field label="Yield description" name="yieldDescription"><Input id="yieldDescription" name="yieldDescription" defaultValue={r.yieldDescription ?? ""} placeholder="about 1 quart" /></Field>
        <Field label="Prep minutes" name="prepMinutes"><Input id="prepMinutes" name="prepMinutes" type="number" min={0} defaultValue={r.prepMinutes ?? ""} /></Field>
        <Field label="Cook minutes" name="cookMinutes"><Input id="cookMinutes" name="cookMinutes" type="number" min={0} defaultValue={r.cookMinutes ?? ""} /></Field>
        <Field label="Usually made" name="defaultPrepPhase" hint="for prep plans">
          <Select id="defaultPrepPhase" name="defaultPrepPhase" defaultValue={r.defaultPrepPhase ?? "DAY_BEFORE"}>{PREP_PHASE_ORDER.map((p) => <option key={p} value={p}>{PREP_PHASE[p]}</option>)}</Select>
        </Field>
        <Field label="Equipment" name="equipment"><Input id="equipment" name="equipment" defaultValue={r.equipment ?? ""} /></Field>
        <Field label="Allergens" name="allergens" hint="comma separated"><Input id="allergens" name="allergens" defaultValue={(r.allergens ?? []).join(", ")} placeholder="Dairy, Tree Nuts" /></Field>
        <Field label="Dietary tags" name="dietaryTags" hint="comma separated"><Input id="dietaryTags" name="dietaryTags" defaultValue={(r.dietaryTags ?? []).join(", ")} placeholder="Vegetarian, Gluten-Free" /></Field>
      </FormGrid>
      <Field label="Method" name="method" hint="one step per line"><Textarea id="method" name="method" rows={6} defaultValue={r.method ?? ""} /></Field>
      <FormGrid>
        <Field label="Holding" name="holdingInstructions"><Textarea id="holdingInstructions" name="holdingInstructions" rows={2} defaultValue={r.holdingInstructions ?? ""} /></Field>
        <Field label="Reheating" name="reheatingInstructions"><Textarea id="reheatingInstructions" name="reheatingInstructions" rows={2} defaultValue={r.reheatingInstructions ?? ""} /></Field>
        <Field label="Transport" name="transportNotes"><Textarea id="transportNotes" name="transportNotes" rows={2} defaultValue={r.transportNotes ?? ""} /></Field>
        <Field label="Plating" name="platingInstructions"><Textarea id="platingInstructions" name="platingInstructions" rows={2} defaultValue={r.platingInstructions ?? ""} /></Field>
      </FormGrid>
      <Field label="Chef notes" name="chefNotes"><Textarea id="chefNotes" name="chefNotes" rows={2} defaultValue={r.chefNotes ?? ""} /></Field>
    </div>
  );
}
