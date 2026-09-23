import Link from "next/link";
import { Mail, MessageSquare, Phone, Plus } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { assignmentCost } from "@/lib/domain/finance";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { STAFF_ROLE } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { ActionDialog } from "@/components/ui/action-form";
import { StaffFields } from "@/components/staff/staff-fields";
import { saveStaff } from "./actions";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const { today } = await getToday();
  const staff = await db.staffMember.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { assignments: { where: { event: { status: { not: "CANCELLED" } } }, include: { event: { select: { date: true, name: true } } } } },
  });
  const unpaidTotal = staff.flatMap((s) => s.assignments).filter((a) => a.status === "COMPLETED").reduce((sum, a) => sum + (a.actualPayCents ?? assignmentCost(a)), 0);
  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Staff"
        description={`${staff.filter((s) => s.active).length} active team members${unpaidTotal ? ` · ${formatMoney(unpaidTotal)} owed for completed shifts` : ""}`}
        actions={<ActionDialog trigger={<><Plus className="h-4 w-4" />Team member</>} triggerVariant="primary" title="Add team member" action={saveStaff}><StaffFields /></ActionDialog>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {staff.map((s) => {
          const upcoming = s.assignments.filter((a) => toISODate(a.event.date) >= today).sort((a, b) => a.event.date.getTime() - b.event.date.getTime());
          const owed = s.assignments.filter((a) => a.status === "COMPLETED").reduce((sum, a) => sum + (a.actualPayCents ?? assignmentCost(a)), 0);
          return (
            <Card key={s.id} className={s.active ? "p-5" : "p-5 opacity-60"}>
              <div className="flex items-start gap-3">
                <Avatar name={s.name} className="h-12 w-12 text-lg" />
                <div className="min-w-0 flex-1">
                  <Link href={`/staff/${s.id}`} className="font-display text-[1.35rem] leading-tight hover:text-wine">{s.name}</Link>
                  <div className="text-sm text-ink-3">{STAFF_ROLE[s.role]} · {formatMoney(s.rateCents)}{s.rateType === "HOURLY" ? "/hr" : " flat"}{s.active ? "" : " · inactive"}</div>
                </div>
              </div>
              {s.availabilityNotes && <p className="mt-3 text-[0.8125rem] text-ink-2">{s.availabilityNotes}</p>}
              <div className="mt-3 text-xs text-ink-3">
                {upcoming.length ? <>Next: <span className="text-ink-2">{upcoming[0].event.name}</span> · {formatDate.short(toISODate(upcoming[0].event.date))}{upcoming.length > 1 ? ` (+${upcoming.length - 1} more)` : ""}</> : "No upcoming events"}
                {owed > 0 && <span className="text-amber"> · owed {formatMoney(owed)}</span>}
              </div>
              <div className="mt-4 flex gap-2 border-t border-line/70 pt-3">
                {s.phone && <a href={`sms:${s.phone}`} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-sand"><MessageSquare className="h-4 w-4" />Text</a>}
                {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-sand"><Phone className="h-4 w-4" />Call</a>}
                {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-2 hover:bg-sand"><Mail className="h-4 w-4" />Email</a>}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-ink-4">“Owed” counts shifts marked Completed but not yet Paid.</p>
    </div>
  );
}
