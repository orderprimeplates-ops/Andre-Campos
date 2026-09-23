import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { STAFF_ROLE } from "@/lib/status";
import { centsToInput } from "@/lib/domain/money";

interface S { name?: string; phone?: string | null; email?: string | null; role?: string; rateCents?: number; rateType?: string; notes?: string | null; availabilityNotes?: string | null; reliabilityNotes?: string | null; active?: boolean }

export function StaffFields({ s, editing }: { s?: S; editing?: boolean }) {
  return (
    <div className="space-y-4">
      <FormGrid>
        <Field label="Name" name="name"><Input id="name" name="name" required defaultValue={s?.name} /></Field>
        <Field label="Role" name="role"><Select id="role" name="role" defaultValue={s?.role ?? "SERVER"}>{Object.entries(STAFF_ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Phone" name="phone"><Input id="phone" name="phone" type="tel" defaultValue={s?.phone ?? ""} /></Field>
        <Field label="Email" name="email"><Input id="email" name="email" type="email" defaultValue={s?.email ?? ""} /></Field>
        <Field label="Typical rate" name="rate"><MoneyInput id="rate" name="rate" defaultValue={centsToInput(s?.rateCents)} /></Field>
        <Field label="Rate type" name="rateType"><Select id="rateType" name="rateType" defaultValue={s?.rateType ?? "HOURLY"}><option value="HOURLY">Per hour</option><option value="FLAT">Flat per event</option></Select></Field>
      </FormGrid>
      <Field label="Availability" name="availabilityNotes"><Input id="availabilityNotes" name="availabilityNotes" defaultValue={s?.availabilityNotes ?? ""} placeholder="Weekends only" /></Field>
      <Field label="Reliability / internal notes" name="reliabilityNotes" hint="private"><Textarea id="reliabilityNotes" name="reliabilityNotes" rows={2} defaultValue={s?.reliabilityNotes ?? ""} /></Field>
      <Field label="Other notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={s?.notes ?? ""} /></Field>
      {editing && <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="active" defaultChecked={s?.active} className="h-4 w-4 accent-[var(--color-wine)]" />Active (available for new events)</label>}
    </div>
  );
}
