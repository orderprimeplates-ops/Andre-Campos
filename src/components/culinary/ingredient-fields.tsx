import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { INGREDIENT_CATEGORY } from "@/lib/status";
import { COMMON_UNITS } from "@/lib/domain/units";
import { centsToInput } from "@/lib/domain/money";

interface Ing {
  name?: string; category?: string; purchaseUnit?: string; packageQty?: number; packageUnit?: string; packagePriceCents?: number;
  yieldPct?: number; gramsPerMl?: number | null; gramsPerEach?: number | null; preferredVendorId?: string | null; isPantryStaple?: boolean; notes?: string | null;
}

export function IngredientFields({ i = {}, vendors }: { i?: Ing; vendors: { id: string; name: string }[] }) {
  return (
    <div className="space-y-5">
      <FormGrid>
        <Field label="Name" name="name"><Input id="name" name="name" required defaultValue={i.name} /></Field>
        <Field label="Category" name="category">
          <Select id="category" name="category" defaultValue={i.category ?? "PRODUCE"}>{Object.entries(INGREDIENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
      </FormGrid>
      <div className="rounded-2xl bg-sand/50 p-4">
        <div className="mb-3 text-[0.8125rem] text-ink-2">How you buy it — e.g. a <em>3 lb bag</em> that holds <em>3 lb</em> for <em>$6.49</em>.</div>
        <FormGrid className="sm:grid-cols-4">
          <Field label="Sold as" name="purchaseUnit"><Input id="purchaseUnit" name="purchaseUnit" required defaultValue={i.purchaseUnit ?? "lb"} placeholder="3 lb bag" /></Field>
          <Field label="Holds" name="packageQty"><Input id="packageQty" name="packageQty" inputMode="decimal" required defaultValue={i.packageQty ?? 1} /></Field>
          <Field label="Unit" name="packageUnit">
            <Input id="packageUnit" name="packageUnit" required defaultValue={i.packageUnit ?? "lb"} list="units" />
          </Field>
          <Field label="Price" name="price"><MoneyInput id="price" name="price" defaultValue={centsToInput(i.packagePriceCents)} /></Field>
        </FormGrid>
        <datalist id="units">{COMMON_UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      </div>
      <FormGrid className="sm:grid-cols-3">
        <Field label="Usable yield %" name="yieldPct" hint="after trim"><Input id="yieldPct" name="yieldPct" inputMode="decimal" defaultValue={i.yieldPct ?? 100} /></Field>
        <Field label="Grams per ml" name="gramsPerMl" hint="for cups ↔ lb"><Input id="gramsPerMl" name="gramsPerMl" inputMode="decimal" defaultValue={i.gramsPerMl ?? ""} placeholder="butter 0.91" /></Field>
        <Field label="Grams each" name="gramsPerEach" hint="for “2 ea” ↔ lb"><Input id="gramsPerEach" name="gramsPerEach" inputMode="decimal" defaultValue={i.gramsPerEach ?? ""} placeholder="onion 250" /></Field>
      </FormGrid>
      <FormGrid>
        <Field label="Preferred store" name="preferredVendorId">
          <Select id="preferredVendorId" name="preferredVendorId" defaultValue={i.preferredVendorId ?? ""}><option value="">—</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
        </Field>
        <label className="flex items-center gap-2.5 self-end pb-3 text-sm text-ink-2">
          <input type="checkbox" name="isPantryStaple" defaultChecked={i.isPantryStaple} className="h-4 w-4 accent-[var(--color-wine)]" />
          Pantry staple (usually on hand)
        </label>
      </FormGrid>
      <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={i.notes ?? ""} /></Field>
    </div>
  );
}
