import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { COURSE, HOLDING, LEVEL, SERVICE_STYLE } from "@/lib/status";

interface D {
  name?: string; description?: string | null; course?: string; cuisine?: string | null; protein?: string | null; dietaryTags?: string[];
  allergens?: string[]; serviceStyles?: string[]; difficulty?: string; prepIntensity?: string; platingDifficulty?: string;
  holdingQuality?: string; chefNotes?: string | null; inLibrary?: boolean;
}

export function DishFields({ d = {}, withLibraryToggle }: { d?: D; withLibraryToggle?: boolean }) {
  return (
    <div className="space-y-6">
      <Field label="Dish name" name="name"><Input id="name" name="name" required defaultValue={d.name} placeholder="Miso-Glazed Chilean Sea Bass" /></Field>
      <Field label="Client-facing description" name="description"><Textarea id="description" name="description" rows={2} defaultValue={d.description ?? ""} placeholder="Ginger-soy beurre blanc, forbidden rice, sesame vegetables, scallion" /></Field>
      <FormGrid className="sm:grid-cols-3">
        <Field label="Course" name="course"><Select id="course" name="course" defaultValue={d.course ?? "ENTREE"}>{Object.entries(COURSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Cuisine" name="cuisine"><Input id="cuisine" name="cuisine" defaultValue={d.cuisine ?? ""} /></Field>
        <Field label="Protein" name="protein"><Input id="protein" name="protein" defaultValue={d.protein ?? ""} list="proteins" /></Field>
      </FormGrid>
      <datalist id="proteins">{["Beef", "Chicken", "Pork", "Lamb", "Seafood", "Shellfish", "Egg", "Vegetarian", "Vegan"].map((p) => <option key={p} value={p} />)}</datalist>
      <FormGrid>
        <Field label="Dietary tags" name="dietaryTags" hint="comma separated"><Input id="dietaryTags" name="dietaryTags" defaultValue={(d.dietaryTags ?? []).join(", ")} /></Field>
        <Field label="Allergens" name="allergens" hint="comma separated"><Input id="allergens" name="allergens" defaultValue={(d.allergens ?? []).join(", ")} /></Field>
      </FormGrid>
      <div>
        <div className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">Suitable service styles</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SERVICE_STYLE).map(([k, v]) => (
            <label key={k} className="cursor-pointer">
              <input type="checkbox" name="serviceStyles" value={k} defaultChecked={d.serviceStyles?.includes(k)} className="peer sr-only" />
              <span className="block rounded-full border border-line px-3 py-1.5 text-sm text-ink-2 peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-linen">{v}</span>
            </label>
          ))}
        </div>
      </div>
      <FormGrid className="sm:grid-cols-4">
        {([["difficulty", "Difficulty"], ["prepIntensity", "Prep intensity"], ["platingDifficulty", "Plating"]] as const).map(([k, label]) => (
          <Field key={k} label={label} name={k}><Select id={k} name={k} defaultValue={d[k] ?? "MEDIUM"}>{Object.entries(LEVEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        ))}
        <Field label="Holding" name="holdingQuality"><Select id="holdingQuality" name="holdingQuality" defaultValue={d.holdingQuality ?? "GOOD"}>{Object.entries(HOLDING).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}</Select></Field>
      </FormGrid>
      <Field label="Internal chef notes" name="chefNotes"><Textarea id="chefNotes" name="chefNotes" rows={2} defaultValue={d.chefNotes ?? ""} /></Field>
      {withLibraryToggle && (
        <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="inLibrary" defaultChecked={d.inLibrary} className="h-4 w-4 accent-[var(--color-wine)]" />Show in the Dish Library</label>
      )}
    </div>
  );
}
