import Link from "next/link";
import { MessageSquare, Pencil, Phone, Plus, TriangleAlert, UserPlus } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { db } from "@/lib/server/db";
import { assignmentCost, assignmentHours } from "@/lib/domain/finance";
import { formatTime } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { STAFF_ROLE } from "@/lib/status";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { ActionDialog } from "@/components/ui/action-form";
import { RemoveButton } from "@/components/ui/remove-button";
import { AssignmentFields } from "@/components/events/assignment-fields";
import { AssignmentStatusSelect } from "@/components/events/assignment-status";
import { addAssignment, removeAssignment, updateAssignment } from "@/app/(app)/events/actions/staff";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export async function StaffTab({ ws }: { ws: WS }) {
  const { event: e, summary: s } = ws;
  const staff = await db.staffMember.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true, rateCents: true, rateType: true } });
  // Who else is booked that day? Flags double-bookings.
  const sameDay = await db.staffAssignment.findMany({
    where: { eventId: { not: e.id }, staffMemberId: { not: null }, event: { date: e.date, status: { not: "CANCELLED" } } },
    select: { staffMemberId: true, event: { select: { name: true } } },
  });
  const busy = new Map(sameDay.map((a) => [a.staffMemberId!, a.event.name]));
  const hoursTotal = e.staffAssignments.reduce((sum, a) => sum + (a.rateType === "HOURLY" ? assignmentHours(a) : 0), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <Card className="min-w-0">
        <CardHeader
          title="Team"
          description={`${s.staffing.confirmed} confirmed · ${s.staffing.unconfirmed} awaiting reply · ${s.staffing.open} open`}
          action={
            <ActionDialog trigger={<><Plus className="h-4 w-4" />Add role</>} triggerSize="sm" triggerVariant="primary" title="Add a role" description="Assign someone now, or leave it open and fill it later." action={addAssignment} hidden={{ eventId: e.id }}>
              <AssignmentFields staff={staff} a={{ callTime: e.arrivalTime, endTime: e.endTime }} />
            </ActionDialog>
          }
        />
        <CardBody>
          {e.staffAssignments.length === 0 ? (
            <EmptyState icon={<UserPlus className="h-6 w-6" />} title="No team yet">Add the roles this event needs — labor flows straight into profitability.</EmptyState>
          ) : (
            <ul className="divide-y divide-line/70">
              {e.staffAssignments.map((a) => {
                const m = a.staffMember;
                const conflict = m ? busy.get(m.id) : undefined;
                return (
                  <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={m?.name ?? "?"} tone={m ? "neutral" : "clay"} />
                      <div className="min-w-0">
                        <div className={cn("font-medium", !m && "text-clay")}>
                          {m ? <Link href={`/staff/${m.id}`} className="hover:text-wine">{m.name}</Link> : `Open — ${STAFF_ROLE[a.role]} needed`}
                        </div>
                        <div className="text-[0.8125rem] text-ink-3">
                          {STAFF_ROLE[a.role]}
                          {a.callTime && ` · ${formatTime(a.callTime)}–${formatTime(a.endTime) || "?"}`}
                          {a.rateType === "HOURLY" ? ` · ${assignmentHours(a).toFixed(1)} h @ ${formatMoney(a.rateCents)}` : " · flat"}
                        </div>
                        {a.responsibilities && <div className="mt-0.5 text-xs text-ink-2">{a.responsibilities}</div>}
                        {conflict && <div className="mt-1 flex items-center gap-1 text-xs text-amber"><TriangleAlert className="h-3 w-3" />Also booked: {conflict}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-12 sm:pl-0">
                      {m?.phone && (
                        <>
                          <a href={`sms:${m.phone}`} className="rounded-lg p-2 text-ink-3 hover:bg-sand hover:text-ink" aria-label={`Text ${m.name}`}><MessageSquare className="h-4 w-4" /></a>
                          <a href={`tel:${m.phone}`} className="rounded-lg p-2 text-ink-3 hover:bg-sand hover:text-ink" aria-label={`Call ${m.name}`}><Phone className="h-4 w-4" /></a>
                        </>
                      )}
                      <span className="w-20 text-right text-sm tabular text-ink">{formatMoney(a.actualPayCents ?? assignmentCost(a))}</span>
                      <AssignmentStatusSelect id={a.id} status={a.status} filled={!!m} />
                      <ActionDialog trigger={<Pencil className="h-4 w-4" />} triggerLabel="Edit" triggerVariant="ghost" triggerSize="icon" title="Edit assignment" action={updateAssignment} hidden={{ id: a.id }}>
                        <AssignmentFields a={a} staff={staff} withActual />
                      </ActionDialog>
                      <RemoveButton action={removeAssignment.bind(null, a.id)} label="Remove role" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
      <aside className="space-y-4">
        <Card>
          <CardBody className="space-y-3 pt-5">
            <div className="eyebrow">Projected labor</div>
            <div className="font-display text-[2.2rem] leading-none tabular">{formatMoney(s.laborCents)}</div>
            <div className="text-sm text-ink-3">{hoursTotal.toFixed(1)} staff hours{s.projection.laborCostPct !== null ? ` · ${s.projection.laborCostPct.toFixed(0)}% of price` : ""}</div>
            <p className="text-xs text-ink-4">Open roles are included at their rate so labor is never understated. Hourly roles without times assume a 5-hour shift.</p>
          </CardBody>
        </Card>
        <p className="px-1 text-xs text-ink-4">Manage the full roster, rates and contact details in <Link href="/staff" className="text-wine hover:underline">Staff</Link>.</p>
      </aside>
    </div>
  );
}
