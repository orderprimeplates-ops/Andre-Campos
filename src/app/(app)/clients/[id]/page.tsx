import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleDollarSign, Heart, Inbox, Mail, MapPin, MessageSquare, Pencil, Phone, Plus, Sparkles, Star, TriangleAlert } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { formatDate, relativeDay, toISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { CONTACT_METHOD, EVENT_STATUS, EVENT_TYPE, LEAD_SOURCE, metaOf, TONE_CLASSES } from "@/lib/status";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input } from "@/components/ui/field";
import { ClientFields } from "@/components/clients/client-fields";
import { addClientAddress, updateClient } from "../actions";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const c = await db.client.findUnique({ where: { id }, select: { name: true } });
  return { title: c?.name ?? "Client" };
}

type TimelineEntry = {
  date: ISODate;
  kind: "event" | "lead" | "payment" | "review";
  title: string;
  detail?: string;
  href?: string;
  tone: keyof typeof TONE_CLASSES;
};

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const [client, { today }] = await Promise.all([
    db.client.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { date: "desc" },
          include: { payments: true, review: true, venue: { select: { name: true } }, menu: { select: { status: true } } },
        },
        leads: { orderBy: { createdAt: "desc" } },
        venues: { orderBy: { createdAt: "asc" } },
      },
    }),
    getToday(),
  ]);
  if (!client) notFound();

  const events = client.events.filter((e) => e.status !== "CANCELLED");
  const payments = events.flatMap((e) => e.payments.map((p) => ({ ...p, eventName: e.name, eventId: e.id })));
  const spend = payments.filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents, 0);
  const tips = payments.filter((p) => p.kind === "TIP").reduce((s, p) => s + p.amountCents, 0);
  const upcoming = events.filter((e) => toISODate(e.date) >= today).reverse();
  const past = events.filter((e) => toISODate(e.date) < today);
  const firstDate = [...events.map((e) => toISODate(e.date)), ...client.leads.map((l) => l.createdAt.toISOString().slice(0, 10))].sort()[0];

  const timeline: TimelineEntry[] = [
    ...events.map((e) => {
      const d = toISODate(e.date);
      const t = metaOf(EVENT_TYPE, e.eventType);
      return {
        date: d, kind: "event" as const, tone: t.tone, href: `/events/${e.id}`,
        title: e.name,
        detail: `${t.label} · ${e.guestCount} guests · ${formatMoney(e.priceCents)}${e.venue ? ` · ${e.venue.name}` : ""}`,
      };
    }),
    ...client.leads.map((l) => ({
      date: l.createdAt.toISOString().slice(0, 10), kind: "lead" as const, tone: "slate" as const, href: `/leads/${l.id}`,
      title: "Inquiry received", detail: `${LEAD_SOURCE[l.source]}${l.requestedService ? ` · ${l.requestedService}` : ""}`,
    })),
    ...payments.map((p) => ({
      date: toISODate(p.receivedOn), kind: "payment" as const, tone: "sage" as const, href: `/events/${p.eventId}?tab=financials`,
      title: `${p.kind === "TIP" ? "Tip" : p.kind === "DEPOSIT" ? "Deposit" : "Payment"} received · ${formatMoney(p.amountCents)}`,
      detail: `${p.eventName}${p.method ? ` · ${p.method}` : ""}`,
    })),
    ...events.filter((e) => e.review?.clientLoved).map((e) => ({
      date: toISODate(e.date), kind: "review" as const, tone: "champagne" as const, href: `/events/${e.id}?tab=notes`,
      title: "What they loved", detail: e.review!.clientLoved!,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date) || (a.kind === "event" ? -1 : 1));

  const contact = [
    client.phone && { href: `sms:${client.phone}`, icon: MessageSquare, label: "Text" },
    client.phone && { href: `tel:${client.phone}`, icon: Phone, label: "Call" },
    client.email && { href: `mailto:${client.email}`, icon: Mail, label: "Email" },
  ].filter(Boolean) as { href: string; icon: typeof Phone; label: string }[];

  const ICON = { event: Sparkles, lead: Inbox, payment: CircleDollarSign, review: Heart };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex animate-fade-up items-center gap-5">
          <Avatar name={client.name} tone="wine" className="h-16 w-16 text-2xl sm:h-20 sm:w-20 sm:text-3xl" />
          <div className="min-w-0">
            <div className="eyebrow mb-1"><Link href="/clients" className="hover:text-wine">Clients</Link>{client.company ? ` · ${client.company}` : ""}</div>
            <h1 className="font-display text-[2.1rem] leading-[1.05] sm:text-[2.6rem]">{client.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-ink-3">
              {client.phone && <span>{client.phone}</span>}
              {client.email && <span>{client.email}</span>}
              {client.preferredContact && <span>Prefers {CONTACT_METHOD[client.preferredContact]?.toLowerCase()}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {contact.map((c) => (
            <a key={c.label} href={c.href} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong/70 bg-linen px-4 text-sm font-medium text-ink hover:border-ink-4">
              <c.icon className="h-4 w-4" />{c.label}
            </a>
          ))}
          <ActionDialog trigger={<><Pencil className="h-4 w-4" />Edit</>} title="Edit client" action={updateClient} hidden={{ id }} wide>
            <ClientFields client={client} />
          </ActionDialog>
          <ButtonLink href={`/events/new?client=${id}`} variant="primary"><Plus className="h-4 w-4" />New event</ButtonLink>
        </div>
      </header>

      {(client.allergies || client.importantNotes) && (
        <div className="grid gap-3 md:grid-cols-2">
          {client.allergies && (
            <div className="flex gap-3 rounded-2xl border border-clay/20 bg-clay-soft/70 px-5 py-4">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
              <div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-clay">Allergies</div><p className="mt-0.5 text-[0.9375rem] text-ink">{client.allergies}</p></div>
            </div>
          )}
          {client.importantNotes && (
            <div className="flex gap-3 rounded-2xl border border-champagne/30 bg-champagne-soft/70 px-5 py-4">
              <Star className="mt-0.5 h-5 w-5 shrink-0 text-champagne" />
              <div><div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a6a35]">Remember</div><p className="mt-0.5 text-[0.9375rem] text-ink">{client.importantNotes}</p></div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Lifetime spend", formatMoney(spend), tips ? `+ ${formatMoney(tips)} tips` : "collected"],
              ["Events", String(events.length), `${upcoming.length} upcoming`],
              ["Average event", events.length ? formatMoney(Math.round(events.reduce((s, e) => s + e.priceCents, 0) / events.length)) : "—", "booking value"],
              ["Client since", firstDate ? formatDate.monthShort(firstDate) + " " + firstDate.slice(0, 4) : "—", LEAD_SOURCE[client.referralSource ?? ""] ?? "—"],
            ].map(([label, value, note]) => (
              <Card key={label} className="p-4">
                <div className="text-xs text-ink-3">{label}</div>
                <div className="mt-1 font-display text-[1.7rem] leading-none tabular">{value}</div>
                <div className="mt-1.5 truncate text-xs text-ink-3">{note}</div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader eyebrow="History" title="Relationship timeline" />
            <CardBody>
              {timeline.length === 0 ? (
                <EmptyState title="No history yet" />
              ) : (
                <ol className="relative ml-1 space-y-1 border-l border-line pl-6">
                  {timeline.map((t, i) => {
                    const Icon = ICON[t.kind];
                    const future = t.date >= today;
                    const body = (
                      <div className={cn("rounded-xl px-3 py-2.5 transition-colors", t.href && "hover:bg-sand/60")}>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className={cn("text-[0.9375rem]", t.kind === "event" ? "font-display text-[1.15rem] text-ink" : "font-medium text-ink")}>{t.title}</span>
                          <span className="text-xs text-ink-3">{formatDate.medium(t.date)}{future ? ` · ${relativeDay(t.date, today)}` : ""}</span>
                        </div>
                        {t.detail && <div className={cn("mt-0.5 text-[0.8125rem] text-ink-2", t.kind === "review" && "italic")}>{t.kind === "review" ? `“${t.detail}”` : t.detail}</div>}
                      </div>
                    );
                    return (
                      <li key={`${t.kind}-${i}`} className="relative">
                        <span className={cn("absolute -left-[2.35rem] top-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-linen", TONE_CLASSES[t.tone].soft)}>
                          <Icon className={cn("h-3 w-3", TONE_CLASSES[t.tone].text)} />
                        </span>
                        {t.href ? <Link href={t.href}>{body}</Link> : body}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="At the table" />
            <CardBody className="space-y-3.5 text-sm">
              {[
                ["Dietary", client.dietaryRestrictions],
                ["Likes", client.likes],
                ["Dislikes", client.dislikes],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-ink-3">{k}</div>
                  <div className={cn("mt-0.5", v ? "text-ink" : "text-ink-4")}>{v ?? "—"}</div>
                </div>
              ))}
            </CardBody>
          </Card>

          {upcoming.length > 0 && (
            <Card>
              <CardHeader title="Upcoming" />
              <CardBody className="space-y-2">
                {upcoming.map((e) => {
                  const st = metaOf(EVENT_STATUS, e.status);
                  return (
                    <Link key={e.id} href={`/events/${e.id}`} className="block rounded-xl border border-line px-3.5 py-3 hover:border-line-strong">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{e.name}</span>
                        <Badge tone={st.tone} size="xs">{st.label}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-3">{formatDate.medium(toISODate(e.date))} · {relativeDay(toISODate(e.date), today)}</div>
                    </Link>
                  );
                })}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Addresses"
              action={
                <ActionDialog trigger={<Plus className="h-4 w-4" />} triggerLabel="Add address" triggerVariant="ghost" triggerSize="icon" title="Add an address" description="Saved as a venue — the kitchen checklist carries over to every event here." action={addClientAddress} hidden={{ clientId: id }}>
                  <Field label="Label" name="name"><Input id="name" name="name" required placeholder="Home, Beach house…" /></Field>
                  <Field label="Street address" name="address"><Input id="address" name="address" /></Field>
                  <FormGrid>
                    <Field label="City" name="city"><Input id="city" name="city" /></Field>
                    <Field label="State" name="state"><Input id="state" name="state" defaultValue="FL" /></Field>
                    <Field label="Parking" name="parkingInstructions"><Input id="parkingInstructions" name="parkingInstructions" /></Field>
                    <Field label="Gate code" name="gateCode"><Input id="gateCode" name="gateCode" /></Field>
                  </FormGrid>
                </ActionDialog>
              }
            />
            <CardBody className="space-y-3">
              {client.venues.length === 0 && <p className="text-sm text-ink-4">No saved addresses.</p>}
              {client.venues.map((v) => (
                <div key={v.id} className="flex gap-3 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-4" />
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-ink-3">{[v.address, v.city, v.state].filter(Boolean).join(", ")}</div>
                    {v.gateCode && <div className="text-xs text-ink-3">Gate {v.gateCode}</div>}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          {client.internalNotes && (
            <Card className="bg-sand/50">
              <CardBody className="pt-5 text-sm">
                <div className="eyebrow mb-1">Internal notes</div>
                <p className="text-ink-2">{client.internalNotes}</p>
                {client.referredBy && <p className="mt-2 text-xs text-ink-3">Referred by {client.referredBy}</p>}
              </CardBody>
            </Card>
          )}
          {past.length > 0 && <p className="px-1 text-xs text-ink-4">Last event {formatDate.medium(toISODate(past[0].date))}</p>}
        </aside>
      </div>
    </div>
  );
}
