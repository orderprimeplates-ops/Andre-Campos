import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { toISODate } from "@/lib/domain/dates";
import { centsToInput } from "@/lib/domain/money";
import { EVENT_TYPE, SERVICE_STYLE } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { convertLead } from "../../actions";

export const metadata = { title: "Convert lead" };

const TYPE_TO_STYLE: Record<string, string> = {
  BUFFET: "BUFFET", FAMILY_STYLE: "FAMILY_STYLE", BRUNCH: "FAMILY_STYLE", COCKTAIL: "PASSED", WEDDING: "BUFFET",
  CORPORATE: "BUFFET", COOKING_CLASS: "INTERACTIVE", DROP_OFF: "DROP_OFF", VACATION_CHEF: "FAMILY_STYLE",
};

function suggestName(name: string, type: string | null) {
  const first = name.split(/[\s&]/)[0];
  const label = type ? EVENT_TYPE[type]?.label : "Dinner";
  return `${first}’s ${label}`;
}

export default async function ConvertLeadPage({ params }: PageProps<"/leads/[id]/convert">) {
  const { id } = await params;
  const [lead, platforms, settings] = await Promise.all([
    db.lead.findUnique({ where: { id } }),
    db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getSettings(),
  ]);
  if (!lead) notFound();
  if (lead.eventId) redirect(`/events/${lead.eventId}`);

  // Is this person already a client? Match on email, phone or exact name.
  const matches = await db.client.findMany({
    where: {
      OR: [
        ...(lead.email ? [{ email: { equals: lead.email, mode: "insensitive" as const } }] : []),
        ...(lead.phone ? [{ phone: lead.phone }] : []),
        { name: { equals: lead.name, mode: "insensitive" as const } },
      ],
    },
    select: { id: true, name: true, email: true, _count: { select: { events: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={<Link href={`/leads/${id}`} className="hover:text-wine">{lead.name}</Link>}
        title="Booked — let’s set it up"
        description="This creates the client and the event with everything from the inquiry. Nothing to re-type."
      />
      <Card>
        <CardBody className="pt-6">
          <ActionForm action={convertLead} hidden={{ leadId: id }} submitLabel="Create client & event">
            <div className="space-y-7">
              <section className="space-y-3">
                <div className="eyebrow">Client</div>
                {matches.length > 0 ? (
                  <div className="space-y-2">
                    {matches.map((m, i) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ivory px-4 py-3 has-[:checked]:border-wine/40 has-[:checked]:bg-wine-soft/40">
                        <input type="radio" name="clientId" value={m.id} defaultChecked={i === 0} className="accent-[var(--color-wine)]" />
                        <span className="text-sm"><strong className="font-medium">{m.name}</strong> <span className="text-ink-3">· existing client · {m._count.events} past events{m.email ? ` · ${m.email}` : ""}</span></span>
                      </label>
                    ))}
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-ivory px-4 py-3 has-[:checked]:border-wine/40 has-[:checked]:bg-wine-soft/40">
                      <input type="radio" name="clientId" value="new" className="accent-[var(--color-wine)]" />
                      <span className="text-sm">Create a new client</span>
                    </label>
                  </div>
                ) : (
                  <input type="hidden" name="clientId" value="new" />
                )}
                <Field label={matches.length ? "New client name (if creating)" : "Client name"} name="clientName">
                  <Input id="clientName" name="clientName" defaultValue={lead.name} />
                </Field>
              </section>

              <section className="space-y-4">
                <div className="eyebrow">Event</div>
                <FormGrid>
                  <Field label="Event name" name="eventName" className="sm:col-span-2"><Input id="eventName" name="eventName" required defaultValue={suggestName(lead.name, lead.eventType)} /></Field>
                  <Field label="Date" name="date"><Input id="date" name="date" type="date" required defaultValue={lead.eventDate ? toISODate(lead.eventDate) : ""} /></Field>
                  <Field label="Service time" name="serviceTime"><Input id="serviceTime" name="serviceTime" type="time" defaultValue="19:00" /></Field>
                  <Field label="Guest count" name="guestCount"><Input id="guestCount" name="guestCount" type="number" min={1} required defaultValue={lead.guestCount ?? ""} /></Field>
                  <Field label="Event type" name="eventType">
                    <Select id="eventType" name="eventType" defaultValue={lead.eventType ?? "PRIVATE_DINNER"}>
                      {Object.entries(EVENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Service style" name="serviceStyle">
                    <Select id="serviceStyle" name="serviceStyle" defaultValue={TYPE_TO_STYLE[lead.eventType ?? ""] ?? "PLATED"}>
                      {Object.entries(SERVICE_STYLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </Field>
                  <Field label="Platform" name="platformId">
                    <Select id="platformId" name="platformId" defaultValue={lead.platformId ?? platforms.find((p) => p.name === "Direct")?.id ?? ""}>
                      {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                </FormGrid>
              </section>

              <section className="space-y-4">
                <div className="eyebrow">Price</div>
                <FormGrid>
                  <Field label="Client price" name="price"><MoneyInput id="price" name="price" defaultValue={centsToInput(lead.estimatedValueCents ?? lead.budgetCents)} /></Field>
                  <Field label="Deposit %" name="depositPct"><Input id="depositPct" name="depositPct" type="number" min={0} max={100} defaultValue={settings.defaultDepositPct} /></Field>
                </FormGrid>
                <p className="text-xs text-ink-3">You can test prices against your margin targets in the event’s Financials tab.</p>
              </section>

              <section className="space-y-4">
                <div className="eyebrow">Venue</div>
                <FormGrid>
                  <Field label="Venue name" name="venueName" hint="optional"><Input id="venueName" name="venueName" defaultValue={lead.location ? `${lead.name.split(" ")[0]}’s — ${lead.location}` : ""} /></Field>
                  <Field label="City" name="venueCity"><Input id="venueCity" name="venueCity" defaultValue={lead.location ?? ""} /></Field>
                  <Field label="Address" name="venueAddress" className="sm:col-span-2"><Input id="venueAddress" name="venueAddress" /></Field>
                </FormGrid>
              </section>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
