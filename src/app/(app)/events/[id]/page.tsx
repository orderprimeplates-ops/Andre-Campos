import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChefHat, Clock, Copy, MapPin, Pencil, ShoppingBasket, Trash2, TriangleAlert, Users } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { getEventWorkspace } from "@/lib/server/workspace";
import { formatDate, formatTime, relativeDay, toISODate, daysBetween } from "@/lib/domain/dates";
import { EVENT_TYPE, SERVICE_STYLE, metaOf } from "@/lib/status";
import { cn } from "@/lib/cn";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-form";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { EventStatusSelect } from "@/components/events/event-status-select";
import { EventDetailsFields } from "@/components/events/event-fields";
import { OverviewTab } from "@/components/events/tabs/overview";
import { MenuTab } from "@/components/events/tabs/menu";
import { GuestsTab } from "@/components/events/tabs/guests";
import { VenueTab } from "@/components/events/tabs/venue";
import { StaffTab } from "@/components/events/tabs/staff";
import { ShoppingTab } from "@/components/events/tabs/shopping";
import { PrepTab } from "@/components/events/tabs/prep";
import { EquipmentTab } from "@/components/events/tabs/equipment";
import { FinancialsTab } from "@/components/events/tabs/financials";
import { NotesTab } from "@/components/events/tabs/notes";
import { deleteEvent, duplicateEvent, updateEventDetails } from "../actions/core";
import { centsToInput } from "@/lib/domain/money";
import { equipmentConflicts } from "@/lib/server/equipment";

export async function generateMetadata({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  const e = await db.event.findUnique({ where: { id }, select: { name: true } });
  return { title: e?.name ?? "Event" };
}

const TABS = ["overview", "menu", "guests", "venue", "staff", "shopping", "prep", "equipment", "financials", "notes"] as const;
type Tab = (typeof TABS)[number];

export default async function EventPage({ params, searchParams }: PageProps<"/events/[id]">) {
  const [{ id }, sp, { today }] = await Promise.all([params, searchParams, getToday()]);
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const [ws, platforms, clients] = await Promise.all([
    getEventWorkspace(id, today),
    db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!ws) notFound();
  const { event: e, summary: s } = ws;
  const conflicts = await equipmentConflicts(e.id);
  const date = toISODate(e.date);
  const type = metaOf(EVENT_TYPE, e.eventType);
  const until = daysBetween(today, date);
  const allergyNotes = e.guestNotes.filter((g) => g.severity === "ALLERGY" || g.severity === "SEVERE_ALLERGY");
  const href = (t: string) => (t === "overview" ? `/events/${id}` : `/events/${id}?tab=${t}`);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "menu", label: "Menu", count: s.menuItemCount || undefined, alert: s.menuItemCount === 0 && until <= 21 && until >= 0 },
    { key: "guests", label: "Guests & Dietary", count: e.guestCount, alert: allergyNotes.length > 0 },
    { key: "venue", label: "Venue & Kitchen", alert: !s.isDropOff && (!s.kitchen.hasVenue || s.kitchen.missingCritical.length > 0) },
    { key: "staff", label: "Staff", count: s.staffing.total || undefined, alert: s.staffing.open + s.staffing.unconfirmed > 0 },
    { key: "shopping", label: "Shopping" },
    { key: "prep", label: "Prep", count: s.prep.total ? `${s.prep.complete}/${s.prep.total}` : undefined },
    { key: "equipment", label: "Equipment", count: s.packing.total ? `${s.packing.packed}/${s.packing.total}` : undefined, alert: conflicts.length > 0 },
    { key: "financials", label: "Financials", alert: s.projection.marginStatus === "below-minimum" || (until < 0 && s.payment.balanceCents > 0) },
    { key: "notes", label: "Notes & Review" },
  ].map((t) => ({ ...t, href: href(t.key) }));

  return (
    <div>
      <header className="mb-6">
        <div className="eyebrow mb-2 flex flex-wrap items-center gap-x-1.5">
          <Link href="/events" className="hover:text-wine">Events</Link>
          <span>·</span>
          <Link href={`/clients/${e.client.id}`} className="hover:text-wine">{e.client.company ?? e.client.name}</Link>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 animate-fade-up">
            <h1 className="font-display text-[2.1rem] leading-[1.05] sm:text-[2.75rem]">{e.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.875rem] text-ink-2">
              <EventStatusSelect id={e.id} status={e.status} />
              <Badge tone={type.tone} size="xs">{type.label}</Badge>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-ink-4" />{formatDate.medium(date)}{e.endDate ? ` – ${formatDate.medium(toISODate(e.endDate))}` : ""} <span className={cn("text-ink-3", until >= 0 && until <= 2 && "font-medium text-wine")}>· {relativeDay(date, today)}</span></span>
              {e.serviceTime && <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-ink-4" />{formatTime(e.serviceTime)}</span>}
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-ink-4" />{e.guestCount} guests{e.guestCountConfirmed ? "" : " (est.)"} · {SERVICE_STYLE[e.serviceStyle]}</span>
              {e.venue && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ink-4" />{e.venue.name}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:flex-nowrap">
            <ButtonLink href={`/events/${id}/shop`} variant="secondary"><ShoppingBasket className="h-4 w-4" />Shop</ButtonLink>
            <ButtonLink href={`/events/${id}/live`} variant="wine"><ChefHat className="h-4 w-4" />Day-of mode</ButtonLink>
            <ActionDialog trigger={<Pencil className="h-4 w-4" />} triggerLabel="Edit event details" triggerSize="icon" title="Edit event details" action={updateEventDetails} hidden={{ id }} wide>
              <EventDetailsFields e={e} platforms={platforms} />
            </ActionDialog>
            <ActionDialog trigger={<Copy className="h-4 w-4" />} triggerLabel="Duplicate event" triggerSize="icon" title="Duplicate this event" description="Copies the menu, staffing needs, equipment, prep plan and timeline. Quantities and costs recalculate for the new guest count." action={duplicateEvent} hidden={{ sourceId: id }} submitLabel="Create copy">
              <Field label="New event name" name="name"><Input id="name" name="name" required defaultValue={`${e.name} (copy)`} /></Field>
              <FormGrid>
                <Field label="Date" name="date"><Input id="date" name="date" type="date" required /></Field>
                <Field label="Guest count" name="guestCount"><Input id="guestCount" name="guestCount" type="number" min={1} required defaultValue={e.guestCount} /></Field>
                <Field label="Client" name="clientId">
                  <Select id="clientId" name="clientId" defaultValue={e.clientId}>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Client price" name="price" hint="blank = scale by guests"><MoneyInput id="price" name="price" placeholder={centsToInput(e.priceCents)} /></Field>
              </FormGrid>
              <div className="flex flex-col gap-2 text-sm text-ink-2">
                <label className="flex items-center gap-2.5"><input type="checkbox" name="keepVenue" defaultChecked className="h-4 w-4 accent-[var(--color-wine)]" />Same venue &amp; kitchen</label>
                <label className="flex items-center gap-2.5"><input type="checkbox" name="keepStaff" className="h-4 w-4 accent-[var(--color-wine)]" />Pre-fill the same staff (as unconfirmed)</label>
              </div>
            </ActionDialog>
          </div>
        </div>
      </header>

      {(allergyNotes.length > 0 || e.client.allergies) && tab !== "guests" && (
        <Link href={href("guests")} className="mb-5 flex items-start gap-3 rounded-2xl border border-clay/20 bg-clay-soft/70 px-5 py-3.5 transition-colors hover:bg-clay-soft">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div className="text-[0.9375rem] text-ink">
            <span className="font-semibold text-clay">Allergies: </span>
            {[...allergyNotes.map((g) => `${g.guestName ? `${g.guestName} — ` : ""}${g.restriction}${g.severity === "SEVERE_ALLERGY" ? " (severe)" : ""}`), ...(allergyNotes.length === 0 && e.client.allergies ? [e.client.allergies] : [])].join(" · ")}
          </div>
        </Link>
      )}

      <LinkTabs tabs={tabs} active={tab} className="mb-6" />

      <div key={tab} className="animate-fade-up">
        {tab === "overview" && <OverviewTab ws={ws} today={today} tabHref={href} />}
        {tab === "menu" && <MenuTab ws={ws} />}
        {tab === "guests" && <GuestsTab ws={ws} />}
        {tab === "venue" && <VenueTab ws={ws} />}
        {tab === "staff" && <StaffTab ws={ws} />}
        {tab === "shopping" && <ShoppingTab ws={ws} />}
        {tab === "prep" && <PrepTab ws={ws} />}
        {tab === "equipment" && <EquipmentTab ws={ws} conflicts={conflicts} />}
        {tab === "financials" && <FinancialsTab ws={ws} today={today} />}
        {tab === "notes" && <NotesTab ws={ws} today={today} />}
      </div>

      <div className="mt-12 flex justify-end border-t border-line pt-5">
        <ConfirmButton action={deleteEvent.bind(null, id)} label="Delete event" confirmLabel="Delete event & everything in it" icon={<Trash2 className="h-4 w-4" />} />
      </div>
    </div>
  );
}
