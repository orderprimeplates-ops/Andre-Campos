import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { toISODate, addDays, fromISODate, formatDate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { EVENT_TYPE, LEAD_SOURCE, LEAD_STATUS, LOST_REASON, metaOf } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LeadBoard } from "@/components/leads/lead-board";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "board";
  const { today } = await getToday();
  // Keep the board focused: lost leads older than 60 days drop off (still in list view).
  const leads = await db.lead.findMany({
    where: view === "board" ? { OR: [{ status: { not: "LOST" } }, { updatedAt: { gte: fromISODate(addDays(today, -60)) } }] } : {},
    orderBy: [{ boardOrder: "asc" }, { createdAt: "desc" }],
    include: { platform: { select: { name: true } } },
  });
  const open = leads.filter((l) => !["BOOKED", "LOST"].includes(l.status));
  const pipeline = open.reduce((s, l) => s + (l.estimatedValueCents ?? 0), 0);
  const recent = leads.filter((l) => l.createdAt >= fromISODate(addDays(today, -90)));
  const decided = recent.filter((l) => l.status === "BOOKED" || l.status === "LOST");
  const winRate = decided.length ? Math.round((decided.filter((l) => l.status === "BOOKED").length / decided.length) * 100) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description={`${open.length} open inquiries · ${formatMoney(pipeline)} in the pipeline${winRate !== null ? ` · ${winRate}% booked (90 days)` : ""}`}
        actions={
          <>
            <Segmented active={view} options={[{ key: "board", label: "Pipeline", href: "/leads" }, { key: "list", label: "List", href: "/leads?view=list" }]} />
            <ButtonLink href="/leads/new" variant="primary"><Plus className="h-4 w-4" />New lead</ButtonLink>
          </>
        }
      />
      {view === "board" ? (
        <>
          <LeadBoard
            today={today}
            leads={leads.map((l) => ({
              id: l.id, name: l.name, status: l.status, eventDate: l.eventDate ? toISODate(l.eventDate) : null, eventType: l.eventType,
              guestCount: l.guestCount, estimatedValueCents: l.estimatedValueCents, source: l.source, lostReason: l.lostReason,
              nextFollowUpDate: l.nextFollowUpDate ? toISODate(l.nextFollowUpDate) : null, boardOrder: l.boardOrder,
            }))}
          />
          <p className="mt-2 text-xs text-ink-4">Drag cards between stages. Dropping on <em>Booked</em> starts the conversion to a client and event.</p>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-sand/50 text-xs text-ink-3">
                <tr>
                  {["Lead", "Status", "Event", "Guests", "Source", "Value", "Follow-up"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {leads.map((l) => {
                  const st = metaOf(LEAD_STATUS, l.status);
                  return (
                    <tr key={l.id} className="transition-colors hover:bg-sand/40">
                      <td className="px-4 py-3"><Link href={`/leads/${l.id}`} className="font-medium text-ink hover:text-wine">{l.name}</Link><div className="text-xs text-ink-3">{l.email ?? l.phone}</div></td>
                      <td className="px-4 py-3"><Badge tone={st.tone} size="xs">{st.label}</Badge>{l.lostReason && <div className="mt-1 text-xs text-ink-3">{LOST_REASON[l.lostReason]}</div>}</td>
                      <td className="px-4 py-3 text-ink-2">{l.eventType ? EVENT_TYPE[l.eventType].label : "—"}<div className="text-xs text-ink-3">{l.eventDate ? formatDate.medium(toISODate(l.eventDate)) : ""}</div></td>
                      <td className="px-4 py-3 tabular text-ink-2">{l.guestCount ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-2">{LEAD_SOURCE[l.source]}{l.platform && <div className="text-xs text-ink-3">{l.platform.name}</div>}</td>
                      <td className="px-4 py-3 tabular text-ink">{formatMoney(l.estimatedValueCents)}</td>
                      <td className="px-4 py-3 text-ink-2">{l.nextFollowUpDate ? formatDate.short(toISODate(l.nextFollowUpDate)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
