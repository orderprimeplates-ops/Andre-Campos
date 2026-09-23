import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { CONTACT_METHOD, LEAD_SOURCE } from "@/lib/status";

interface ClientLike {
  name?: string; company?: string | null; phone?: string | null; email?: string | null; preferredContact?: string | null;
  dietaryRestrictions?: string | null; allergies?: string | null; likes?: string | null; dislikes?: string | null;
  importantNotes?: string | null; internalNotes?: string | null; referralSource?: string | null; referredBy?: string | null;
}

export function ClientFields({ client = {} }: { client?: ClientLike }) {
  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div className="eyebrow">Contact</div>
        <FormGrid>
          <Field label="Name" name="name"><Input id="name" name="name" required defaultValue={client.name} /></Field>
          <Field label="Company" name="company" hint="for corporate clients"><Input id="company" name="company" defaultValue={client.company ?? ""} /></Field>
          <Field label="Phone" name="phone"><Input id="phone" name="phone" type="tel" defaultValue={client.phone ?? ""} /></Field>
          <Field label="Email" name="email"><Input id="email" name="email" type="email" defaultValue={client.email ?? ""} /></Field>
          <Field label="Preferred contact" name="preferredContact">
            <Select id="preferredContact" name="preferredContact" defaultValue={client.preferredContact ?? ""}>
              <option value="">—</option>
              {Object.entries(CONTACT_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Referral source" name="referralSource">
            <Select id="referralSource" name="referralSource" defaultValue={client.referralSource ?? ""}>
              <option value="">—</option>
              {Object.entries(LEAD_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Referred by" name="referredBy" className="sm:col-span-2"><Input id="referredBy" name="referredBy" defaultValue={client.referredBy ?? ""} /></Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">At the table</div>
        <FormGrid>
          <Field label="Allergies" name="allergies" hint="shown in red everywhere" className="sm:col-span-2"><Textarea id="allergies" name="allergies" rows={2} defaultValue={client.allergies ?? ""} /></Field>
          <Field label="Dietary restrictions" name="dietaryRestrictions" className="sm:col-span-2"><Textarea id="dietaryRestrictions" name="dietaryRestrictions" rows={2} defaultValue={client.dietaryRestrictions ?? ""} /></Field>
          <Field label="Likes" name="likes"><Textarea id="likes" name="likes" rows={2} defaultValue={client.likes ?? ""} /></Field>
          <Field label="Dislikes" name="dislikes"><Textarea id="dislikes" name="dislikes" rows={2} defaultValue={client.dislikes ?? ""} /></Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">Notes</div>
        <Field label="Important notes" name="importantNotes" hint="things every event should know"><Textarea id="importantNotes" name="importantNotes" rows={2} defaultValue={client.importantNotes ?? ""} /></Field>
        <Field label="Internal notes" name="internalNotes" hint="private"><Textarea id="internalNotes" name="internalNotes" rows={2} defaultValue={client.internalNotes ?? ""} /></Field>
      </section>
    </div>
  );
}
