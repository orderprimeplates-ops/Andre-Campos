import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { EVENT_STATUS, EVENT_STATUS_ORDER, EVENT_TYPE, SERVICE_STYLE } from "@/lib/status";
import { centsToInput } from "@/lib/domain/money";
import { toISODate } from "@/lib/domain/dates";

interface EventLike {
  name?: string; eventType?: string; serviceStyle?: string; status?: string; date?: Date; endDate?: Date | null;
  arrivalTime?: string | null; serviceTime?: string | null; endTime?: string | null; guestCount?: number;
  guestCountConfirmed?: boolean; finalCountDueDate?: Date | null; platformId?: string | null; priceCents?: number;
  depositCents?: number; depositDueDate?: Date | null; balanceDueDate?: Date | null; shoppingDate?: Date | null;
  prepStartDate?: Date | null; roundTripMiles?: number | null; description?: string | null;
}

const d = (v?: Date | null) => (v ? toISODate(v) : "");

/** Full event details form used by the workspace "Edit details" dialog. */
export function EventDetailsFields({ e, platforms }: { e: EventLike; platforms: { id: string; name: string }[] }) {
  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div className="eyebrow">The event</div>
        <Field label="Event name" name="name"><Input id="name" name="name" required defaultValue={e.name} /></Field>
        <FormGrid>
          <Field label="Event type" name="eventType">
            <Select id="eventType" name="eventType" defaultValue={e.eventType}>
              {Object.entries(EVENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
          </Field>
          <Field label="Service style" name="serviceStyle">
            <Select id="serviceStyle" name="serviceStyle" defaultValue={e.serviceStyle}>
              {Object.entries(SERVICE_STYLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={e.status}>
              {EVENT_STATUS_ORDER.map((s) => <option key={s} value={s}>{EVENT_STATUS[s].label}</option>)}
            </Select>
          </Field>
          <Field label="Booking platform" name="platformId">
            <Select id="platformId" name="platformId" defaultValue={e.platformId ?? ""}>
              <option value="">None</option>
              {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">When</div>
        <FormGrid className="sm:grid-cols-3">
          <Field label="Date" name="date"><Input id="date" name="date" type="date" required defaultValue={d(e.date)} /></Field>
          <Field label="End date" name="endDate" hint="multi-day"><Input id="endDate" name="endDate" type="date" defaultValue={d(e.endDate)} /></Field>
          <div className="hidden sm:block" />
          <Field label="Arrival" name="arrivalTime"><Input id="arrivalTime" name="arrivalTime" type="time" defaultValue={e.arrivalTime ?? ""} /></Field>
          <Field label="Service" name="serviceTime"><Input id="serviceTime" name="serviceTime" type="time" defaultValue={e.serviceTime ?? ""} /></Field>
          <Field label="Est. completion" name="endTime"><Input id="endTime" name="endTime" type="time" defaultValue={e.endTime ?? ""} /></Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">Guests</div>
        <FormGrid className="sm:grid-cols-3">
          <Field label="Guest count" name="guestCount"><Input id="guestCount" name="guestCount" type="number" min={1} required defaultValue={e.guestCount} /></Field>
          <Field label="Final count due" name="finalCountDueDate"><Input id="finalCountDueDate" name="finalCountDueDate" type="date" defaultValue={d(e.finalCountDueDate)} /></Field>
          <label className="flex items-center gap-2.5 self-end pb-3 text-sm text-ink-2">
            <input type="checkbox" name="guestCountConfirmed" defaultChecked={e.guestCountConfirmed} className="h-4 w-4 accent-[var(--color-wine)]" />
            Final count confirmed
          </label>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">Money</div>
        <FormGrid className="sm:grid-cols-3">
          <Field label="Client price" name="price"><MoneyInput id="price" name="price" defaultValue={centsToInput(e.priceCents)} /></Field>
          <Field label="Deposit" name="deposit"><MoneyInput id="deposit" name="deposit" defaultValue={centsToInput(e.depositCents)} /></Field>
          <Field label="Round-trip miles" name="roundTripMiles"><Input id="roundTripMiles" name="roundTripMiles" inputMode="decimal" defaultValue={e.roundTripMiles ?? ""} /></Field>
          <Field label="Deposit due" name="depositDueDate"><Input id="depositDueDate" name="depositDueDate" type="date" defaultValue={d(e.depositDueDate)} /></Field>
          <Field label="Balance due" name="balanceDueDate"><Input id="balanceDueDate" name="balanceDueDate" type="date" defaultValue={d(e.balanceDueDate)} /></Field>
        </FormGrid>
      </section>
      <section className="space-y-4">
        <div className="eyebrow">Planning dates</div>
        <FormGrid>
          <Field label="Shopping day" name="shoppingDate"><Input id="shoppingDate" name="shoppingDate" type="date" defaultValue={d(e.shoppingDate)} /></Field>
          <Field label="Prep begins" name="prepStartDate"><Input id="prepStartDate" name="prepStartDate" type="date" defaultValue={d(e.prepStartDate)} /></Field>
        </FormGrid>
        <Field label="Description" name="description"><Textarea id="description" name="description" rows={3} defaultValue={e.description ?? ""} /></Field>
      </section>
    </div>
  );
}
