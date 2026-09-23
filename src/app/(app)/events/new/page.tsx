import { db } from "@/lib/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select, Textarea } from "@/components/ui/field";
import { EVENT_TYPE, SERVICE_STYLE } from "@/lib/status";
import { createEvent } from "../actions/core";
import { ClientChooser } from "./new-event-client";

export const metadata = { title: "New event" };

export default async function NewEventPage({ searchParams }: PageProps<"/events/new">) {
  const sp = await searchParams;
  const [clients, platforms, venues] = await Promise.all([
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const clientId = typeof sp.client === "string" ? sp.client : undefined;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Events" title="New event" description="The essentials now — menu, staff, shopping and prep live in the event workspace." />
      <Card>
        <CardBody className="pt-6">
          <ActionForm action={createEvent} submitLabel="Create event">
            <div className="space-y-7">
              <ClientChooser clients={clients} defaultId={clientId} />
              <section className="space-y-4">
                <div className="eyebrow">The event</div>
                <Field label="Event name" name="name"><Input id="name" name="name" required placeholder="Anniversary dinner for the Okafors" /></Field>
                <FormGrid>
                  <Field label="Event type" name="eventType">
                    <Select id="eventType" name="eventType" defaultValue="PRIVATE_DINNER">{Object.entries(EVENT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
                  </Field>
                  <Field label="Service style" name="serviceStyle">
                    <Select id="serviceStyle" name="serviceStyle" defaultValue="PLATED">{Object.entries(SERVICE_STYLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  </Field>
                  <Field label="Status" name="status">
                    <Select id="status" name="status" defaultValue="BOOKED"><option value="TENTATIVE">Tentative</option><option value="BOOKED">Booked</option></Select>
                  </Field>
                  <Field label="Venue" name="venueId" hint="optional">
                    <Select id="venueId" name="venueId" defaultValue=""><option value="">Decide later</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
                  </Field>
                </FormGrid>
              </section>
              <section className="space-y-4">
                <div className="eyebrow">When & how many</div>
                <FormGrid className="sm:grid-cols-4">
                  <Field label="Date" name="date"><Input id="date" name="date" type="date" required /></Field>
                  <Field label="Arrive" name="arrivalTime"><Input id="arrivalTime" name="arrivalTime" type="time" /></Field>
                  <Field label="Service" name="serviceTime"><Input id="serviceTime" name="serviceTime" type="time" defaultValue="19:00" /></Field>
                  <Field label="Guests" name="guestCount"><Input id="guestCount" name="guestCount" type="number" min={1} required /></Field>
                </FormGrid>
              </section>
              <section className="space-y-4">
                <div className="eyebrow">Price</div>
                <FormGrid>
                  <Field label="Client price" name="price" hint="test margins later"><MoneyInput id="price" name="price" /></Field>
                  <Field label="Booking platform" name="platformId">
                    <Select id="platformId" name="platformId" defaultValue={platforms.find((p) => p.name === "Direct")?.id ?? ""}><option value="">None</option>{platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
                  </Field>
                </FormGrid>
                <Field label="Notes" name="description"><Textarea id="description" name="description" rows={2} /></Field>
                <p className="text-xs text-ink-4">Deposit, final-count, balance, shopping and prep dates are set automatically from your business rules — adjust any of them later.</p>
              </section>
            </div>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
