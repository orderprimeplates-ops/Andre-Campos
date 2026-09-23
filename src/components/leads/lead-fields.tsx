import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { EVENT_TYPE, LEAD_SOURCE } from "@/lib/status";
import { centsToInput } from "@/lib/domain/money";
import { toISODate } from "@/lib/domain/dates";

interface LeadLike {
  name?: string; phone?: string | null; email?: string | null; eventDate?: Date | null; location?: string | null;
  guestCount?: number | null; eventType?: string | null; requestedService?: string | null; budgetCents?: number | null;
  cuisineRequest?: string | null; dietaryRestrictions?: string | null; source?: string; platformId?: string | null;
  notes?: string | null; estimatedValueCents?: number | null; nextFollowUpDate?: Date | null;
}

/** All lead fields, grouped the way an inquiry conversation flows. */
export function LeadFields({ lead = {}, platforms }: { lead?: LeadLike; platforms: { id: string; name: string }[] }) {
  const d = (v?: Date | null) => (v ? toISODate(v) : "");
  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div className="eyebrow">Who</div>
        <FormGrid>
          <Field label="Name" name="name" className="sm:col-span-2"><Input id="name" name="name" required defaultValue={lead.name} placeholder="Maya Richardson" /></Field>
          <Field label="Phone" name="phone"><Input id="phone" name="phone" type="tel" defaultValue={lead.phone ?? ""} /></Field>
          <Field label="Email" name="email"><Input id="email" name="email" type="email" defaultValue={lead.email ?? ""} /></Field>
          <Field label="Lead source" name="source">
            <Select id="source" name="source" defaultValue={lead.source ?? "INSTAGRAM"}>
              {Object.entries(LEAD_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Booking platform" name="platformId" hint="for fee calculations">
            <Select id="platformId" name="platformId" defaultValue={lead.platformId ?? ""}>
              <option value="">Direct / none</option>
              {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">The event</div>
        <FormGrid>
          <Field label="Event date" name="eventDate"><Input id="eventDate" name="eventDate" type="date" defaultValue={d(lead.eventDate)} /></Field>
          <Field label="Guest count" name="guestCount"><Input id="guestCount" name="guestCount" type="number" min={1} inputMode="numeric" defaultValue={lead.guestCount ?? ""} /></Field>
          <Field label="Event type" name="eventType">
            <Select id="eventType" name="eventType" defaultValue={lead.eventType ?? ""}>
              <option value="">Not sure yet</option>
              {Object.entries(EVENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Location" name="location"><Input id="location" name="location" defaultValue={lead.location ?? ""} placeholder="Key Biscayne" /></Field>
          <Field label="Requested service" name="requestedService" className="sm:col-span-2"><Input id="requestedService" name="requestedService" defaultValue={lead.requestedService ?? ""} placeholder="Four-course plated dinner with passed apps" /></Field>
          <Field label="Cuisine / menu request" name="cuisineRequest"><Input id="cuisineRequest" name="cuisineRequest" defaultValue={lead.cuisineRequest ?? ""} /></Field>
          <Field label="Dietary restrictions" name="dietaryRestrictions"><Input id="dietaryRestrictions" name="dietaryRestrictions" defaultValue={lead.dietaryRestrictions ?? ""} /></Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">Money & next step</div>
        <FormGrid>
          <Field label="Client’s budget" name="budget"><MoneyInput id="budget" name="budget" defaultValue={centsToInput(lead.budgetCents)} /></Field>
          <Field label="Estimated booking value" name="estimatedValue"><MoneyInput id="estimatedValue" name="estimatedValue" defaultValue={centsToInput(lead.estimatedValueCents)} /></Field>
          <Field label="Next follow-up" name="nextFollowUpDate"><Input id="nextFollowUpDate" name="nextFollowUpDate" type="date" defaultValue={d(lead.nextFollowUpDate)} /></Field>
        </FormGrid>
        <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} /></Field>
      </section>
    </div>
  );
}
