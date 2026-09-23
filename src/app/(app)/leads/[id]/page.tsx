import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Mail, MapPin, Phone, Sparkles, Trash2, Users, XCircle } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { daysBetween, formatDate, relativeDay, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { EVENT_TYPE, LEAD_SOURCE, LEAD_STATUS, LOST_REASON, metaOf } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { KeyValue } from "@/components/ui/misc";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/field";
import { LeadFields } from "@/components/leads/lead-fields";
import { LogContactButtons, StageStepper } from "@/components/leads/lead-actions";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteLead, markLost, updateLead } from "../actions";

export async function generateMetadata({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const l = await db.lead.findUnique({ where: { id }, select: { name: true } });
  return { title: l?.name ?? "Lead" };
}

export default async function LeadPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  const [lead, platforms, { today }] = await Promise.all([
    db.lead.findUnique({ where: { id }, include: { platform: true, client: true, event: { select: { id: true, name: true } } } }),
    db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    getToday(),
  ]);
  if (!lead) notFound();
  const st = metaOf(LEAD_STATUS, lead.status);
  const eventDate = lead.eventDate ? toISODate(lead.eventDate) : null;
  const follow = lead.nextFollowUpDate ? toISODate(lead.nextFollowUpDate) : null;
  const open = lead.status !== "BOOKED" && lead.status !== "LOST";

  return (
    <div>
      <PageHeader
        eyebrow={<Link href="/leads" className="hover:text-wine">Leads</Link>}
        title={lead.name}
        actions={
          open ? (
            <>
              <ActionDialog trigger={<><XCircle className="h-4 w-4" />Mark lost</>} triggerVariant="ghost" title="Mark as lost" action={markLost} hidden={{ id }} submitLabel="Mark lost">
                <Field label="Reason" name="lostReason">
                  <Select id="lostReason" name="lostReason" defaultValue="PRICE">
                    {Object.entries(LOST_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Notes" name="lostNotes"><Textarea id="lostNotes" name="lostNotes" rows={2} /></Field>
              </ActionDialog>
              <ButtonLink href={`/leads/${id}/convert`} variant="wine"><Sparkles className="h-4 w-4" />Booked — convert</ButtonLink>
            </>
          ) : lead.event ? (
            <ButtonLink href={`/events/${lead.event.id}`} variant="primary">Open event <ArrowRight className="h-4 w-4" /></ButtonLink>
          ) : null
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={st.tone} dot>{st.label}</Badge>
          <Badge>{LEAD_SOURCE[lead.source]}{lead.platform && lead.platform.name !== LEAD_SOURCE[lead.source] ? ` · via ${lead.platform.name}` : ""}</Badge>
          <span className="text-xs text-ink-3">Received {formatDate.medium(lead.createdAt.toISOString().slice(0, 10))}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          {open && (
            <Card>
              <CardBody className="space-y-4 pt-5">
                <StageStepper id={id} status={lead.status} />
                <div className="border-t border-line pt-4">
                  <LogContactButtons id={id} />
                </div>
              </CardBody>
            </Card>
          )}
          {lead.status === "LOST" && (
            <Card className="bg-sand/50">
              <CardBody className="pt-5">
                <div className="eyebrow mb-1">Lost</div>
                <div className="font-display text-xl">{LOST_REASON[lead.lostReason ?? "OTHER"]}</div>
                {lead.lostNotes && <p className="mt-1 text-sm text-ink-2">{lead.lostNotes}</p>}
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Inquiry details" />
            <CardBody>
              <ActionForm action={updateLead} hidden={{ id }} submitLabel="Save changes">
                <LeadFields lead={lead} platforms={platforms} />
              </ActionForm>
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardBody className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <KeyValue label="Estimated value"><span className="font-display text-2xl">{formatMoney(lead.estimatedValueCents)}</span></KeyValue>
                <KeyValue label="Budget"><span className="font-display text-2xl text-ink-2">{formatMoney(lead.budgetCents)}</span></KeyValue>
              </div>
              <div className="space-y-2.5 border-t border-line pt-4 text-sm text-ink-2">
                {eventDate && <div className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 text-ink-4" /><span>{formatDate.medium(eventDate)} <span className="text-ink-3">· {relativeDay(eventDate, today)}</span></span></div>}
                {lead.guestCount && <div className="flex items-center gap-2.5"><Users className="h-4 w-4 text-ink-4" />{lead.guestCount} guests{lead.eventType ? ` · ${EVENT_TYPE[lead.eventType].label}` : ""}</div>}
                {lead.location && <div className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-ink-4" />{lead.location}</div>}
                {lead.phone && <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 hover:text-wine"><Phone className="h-4 w-4 text-ink-4" />{lead.phone}</a>}
                {lead.email && <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 truncate hover:text-wine"><Mail className="h-4 w-4 text-ink-4" />{lead.email}</a>}
              </div>
              {follow && open && (
                <div className={`rounded-xl px-3.5 py-2.5 text-sm ${daysBetween(today, follow) < 0 ? "bg-clay-soft text-clay" : "bg-sand text-ink-2"}`}>
                  Next follow-up <strong className="font-semibold">{formatDate.medium(follow)}</strong> · {relativeDay(follow, today)}
                </div>
              )}
              {lead.lastContactedAt && <div className="text-xs text-ink-3">Last contacted {formatDate.medium(lead.lastContactedAt.toISOString().slice(0, 10))}</div>}
            </CardBody>
          </Card>
          {lead.client && (
            <Link href={`/clients/${lead.client.id}`} className="block rounded-2xl border border-line bg-linen px-4 py-3 text-sm hover:border-line-strong">
              <div className="text-xs text-ink-3">Client</div>
              <div className="font-medium">{lead.client.name}</div>
            </Link>
          )}
          <ConfirmButton action={deleteLead.bind(null, id)} label="Delete lead" confirmLabel="Delete permanently" icon={<Trash2 className="h-4 w-4" />} />
        </aside>
      </div>
    </div>
  );
}
