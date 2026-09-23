import { CheckCircle2, CircleHelp, ImagePlus, MapPin, Navigation, Phone, Plus, TriangleAlert } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { db } from "@/lib/server/db";
import { kitchenReadiness } from "@/lib/domain/kitchen";
import { AVAILABILITY, SPACE_LEVEL } from "@/lib/status";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/misc";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea, YesNoUnknown } from "@/components/ui/field";
import { VenuePicker } from "@/components/events/venue-picker";
import { createVenueForEvent, updateVenueKitchen } from "@/app/(app)/events/actions/venue";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

function EnumSelect({ name, value, options }: { name: string; value: string | null; options: Record<string, string> }) {
  return (
    <Select id={name} name={name} defaultValue={value ?? ""}>
      <option value="">Unknown</option>
      {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </Select>
  );
}

export async function VenueTab({ ws }: { ws: WS }) {
  const { event: e, summary: s } = ws;
  const venues = await db.venue.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } });
  const options = venues.map((v) => ({ id: v.id, name: v.name, group: v.clientId === e.clientId ? `${e.client.name}’s places` : "All venues" }));
  const v = e.venue;
  const r = kitchenReadiness(v);
  const groups = [...new Set(r.items.map((i) => i.group))];
  const mapsUrl = v?.address ? `https://maps.apple.com/?q=${encodeURIComponent([v.address, v.city, v.state].filter(Boolean).join(", "))}` : null;

  const newVenue = (
    <ActionDialog trigger={<><Plus className="h-4 w-4" />New venue</>} triggerSize="sm" title="New venue" action={createVenueForEvent} hidden={{ eventId: e.id, clientId: e.clientId }}>
      <Field label="Venue name" name="name"><Input id="name" name="name" required placeholder="Casa Marea (Airbnb)" /></Field>
      <Field label="Street address" name="address"><Input id="address" name="address" /></Field>
      <FormGrid>
        <Field label="City" name="city"><Input id="city" name="city" /></Field>
        <Field label="State" name="state"><Input id="state" name="state" defaultValue="FL" /></Field>
      </FormGrid>
      <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="clientOwned" defaultChecked className="h-4 w-4 accent-[var(--color-wine)]" />This is {e.client.name}’s own place</label>
    </ActionDialog>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Venue" action={newVenue} />
          <CardBody className="space-y-4">
            <VenuePicker eventId={e.id} venueId={e.venueId} venues={options} />
            {v && (
              <div className="space-y-2 text-sm text-ink-2">
                {v.address && (
                  <div className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" /><span>{[v.address, v.city, v.state, v.postalCode].filter(Boolean).join(", ")}</span></div>
                )}
                {v.contactPhone && <a href={`tel:${v.contactPhone}`} className="flex gap-2.5 hover:text-wine"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />{v.contactName ? `${v.contactName} · ` : ""}{v.contactPhone}</a>}
                {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex gap-2.5 text-wine hover:underline"><Navigation className="mt-0.5 h-4 w-4 shrink-0" />Directions</a>}
              </div>
            )}
            {s.isDropOff && <p className="rounded-xl bg-sand px-3.5 py-2.5 text-xs text-ink-3">Drop-off event — a full kitchen checklist isn’t required.</p>}
          </CardBody>
        </Card>

        {v && (
          <Card>
            <CardBody className="pt-5">
              <div className="flex items-center gap-4">
                <ProgressRing value={r.pct} size={64} stroke={5} tone={r.missingCritical.length ? "amber" : "sage"}>
                  <span className="font-display text-lg">{r.pct}%</span>
                </ProgressRing>
                <div>
                  <div className="eyebrow">Kitchen readiness</div>
                  <div className="text-sm text-ink-2">{r.knownCount} of {r.total} details known</div>
                </div>
              </div>
              {r.missingCritical.length > 0 && (
                <div className="mt-4 flex gap-2 rounded-xl bg-amber-soft px-3.5 py-2.5 text-[0.8125rem] text-amber">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Still need: {r.missingCritical.join(", ")}</span>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {groups.map((g) => (
                  <div key={g}>
                    <div className="eyebrow mb-1.5">{g}</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {r.items.filter((i) => i.group === g).map((i) => (
                        <div key={i.key} className="flex items-center gap-1.5 text-[0.8125rem]">
                          {i.known ? <CheckCircle2 className="h-3.5 w-3.5 text-sage" /> : <CircleHelp className={cn("h-3.5 w-3.5", i.critical ? "text-amber" : "text-ink-4")} />}
                          <span className={i.known ? "text-ink-2" : "text-ink-3"}>{i.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong/60 px-4 py-3 text-xs text-ink-3">
          <ImagePlus className="h-4 w-4 shrink-0" />
          Kitchen photos arrive once file storage is connected (a hosting decision — see the architecture notes).
        </div>
      </div>

      {v ? (
        <Card>
          <CardHeader title="Kitchen checklist" description="Leave anything you don’t know yet as “Unknown” — readiness stays honest." />
          <CardBody>
            <ActionForm action={updateVenueKitchen} hidden={{ venueId: v.id }} submitLabel="Save kitchen details">
              <div className="space-y-7">
                <section className="space-y-4">
                  <div className="eyebrow">Access</div>
                  <FormGrid>
                    <Field label="Venue name" name="name"><Input id="name" name="name" required defaultValue={v.name} /></Field>
                    <Field label="Street address" name="address"><Input id="address" name="address" defaultValue={v.address ?? ""} /></Field>
                    <Field label="City" name="city"><Input id="city" name="city" defaultValue={v.city ?? ""} /></Field>
                    <FormGrid className="gap-3">
                      <Field label="State" name="state"><Input id="state" name="state" defaultValue={v.state ?? ""} /></Field>
                      <Field label="ZIP" name="postalCode"><Input id="postalCode" name="postalCode" defaultValue={v.postalCode ?? ""} /></Field>
                    </FormGrid>
                    <Field label="Parking & load-in" name="parkingInstructions"><Input id="parkingInstructions" name="parkingInstructions" defaultValue={v.parkingInstructions ?? ""} /></Field>
                    <Field label="Gate / door code" name="gateCode"><Input id="gateCode" name="gateCode" defaultValue={v.gateCode ?? ""} /></Field>
                    <Field label="On-site contact" name="contactName"><Input id="contactName" name="contactName" defaultValue={v.contactName ?? ""} /></Field>
                    <Field label="Contact phone" name="contactPhone"><Input id="contactPhone" name="contactPhone" type="tel" defaultValue={v.contactPhone ?? ""} /></Field>
                  </FormGrid>
                </section>
                <section className="space-y-4">
                  <div className="eyebrow">Cooking</div>
                  <FormGrid>
                    <Field label="Stove type" name="stoveType"><Input id="stoveType" name="stoveType" defaultValue={v.stoveType ?? ""} placeholder="Gas, induction, electric coil…" /></Field>
                    <Field label="Number of burners" name="burnerCount"><Input id="burnerCount" name="burnerCount" type="number" min={0} defaultValue={v.burnerCount ?? ""} /></Field>
                    <Field label="Oven" name="hasOven"><YesNoUnknown name="hasOven" defaultValue={v.hasOven} /></Field>
                    <Field label="Oven notes" name="ovenNotes"><Input id="ovenNotes" name="ovenNotes" defaultValue={v.ovenNotes ?? ""} placeholder="Runs cool; convection" /></Field>
                    <Field label="Grill" name="hasGrill"><YesNoUnknown name="hasGrill" defaultValue={v.hasGrill} /></Field>
                    <Field label="Microwave" name="hasMicrowave"><YesNoUnknown name="hasMicrowave" defaultValue={v.hasMicrowave} /></Field>
                    <Field label="Electrical limitations" name="electricalNotes"><Input id="electricalNotes" name="electricalNotes" defaultValue={v.electricalNotes ?? ""} /></Field>
                    <Field label="Outdoor cooking" name="outdoorCooking"><Input id="outdoorCooking" name="outdoorCooking" defaultValue={v.outdoorCooking ?? ""} /></Field>
                  </FormGrid>
                </section>
                <section className="space-y-4">
                  <div className="eyebrow">Storage & space</div>
                  <FormGrid>
                    <Field label="Refrigerator space" name="fridgeSpace"><EnumSelect name="fridgeSpace" value={v.fridgeSpace} options={SPACE_LEVEL} /></Field>
                    <Field label="Freezer space" name="freezerSpace"><EnumSelect name="freezerSpace" value={v.freezerSpace} options={SPACE_LEVEL} /></Field>
                    <Field label="Counter / prep space" name="counterSpace"><EnumSelect name="counterSpace" value={v.counterSpace} options={SPACE_LEVEL} /></Field>
                    <div />
                    <Field label="Sink" name="hasSink"><YesNoUnknown name="hasSink" defaultValue={v.hasSink} /></Field>
                    <Field label="Dishwasher" name="hasDishwasher"><YesNoUnknown name="hasDishwasher" defaultValue={v.hasDishwasher} /></Field>
                  </FormGrid>
                </section>
                <section className="space-y-4">
                  <div className="eyebrow">Service ware</div>
                  <FormGrid>
                    <Field label="Available cookware" name="cookware"><Input id="cookware" name="cookware" defaultValue={v.cookware ?? ""} /></Field>
                    <Field label="Sheet pans" name="sheetPans"><Input id="sheetPans" name="sheetPans" defaultValue={v.sheetPans ?? ""} /></Field>
                    <Field label="Serving pieces" name="servingPieces" className="sm:col-span-2"><Input id="servingPieces" name="servingPieces" defaultValue={v.servingPieces ?? ""} /></Field>
                    <Field label="Plates" name="plates"><EnumSelect name="plates" value={v.plates} options={AVAILABILITY} /></Field>
                    <Field label="Flatware" name="flatware"><EnumSelect name="flatware" value={v.flatware} options={AVAILABILITY} /></Field>
                    <Field label="Glassware" name="glassware"><EnumSelect name="glassware" value={v.glassware} options={AVAILABILITY} /></Field>
                  </FormGrid>
                  <Field label="Other notes" name="otherNotes"><Textarea id="otherNotes" name="otherNotes" rows={2} defaultValue={v.otherNotes ?? ""} /></Field>
                </section>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="py-14 text-center">
            <MapPin className="mx-auto mb-3 h-7 w-7 text-ink-4" />
            <div className="font-display text-2xl">Where are we cooking?</div>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-3">Choose a saved venue or add a new one. Its kitchen checklist is remembered for next time.</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
