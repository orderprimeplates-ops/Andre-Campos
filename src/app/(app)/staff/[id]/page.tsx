import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageSquare, Pencil, Phone } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { assignmentCost, assignmentHours } from "@/lib/domain/finance";
import { formatDate, formatTime, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { STAFF_ROLE, STAFF_STATUS, metaOf } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { StatusDot } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-form";
import { StaffFields } from "@/components/staff/staff-fields";
import { AssignmentStatusSelect } from "@/components/events/assignment-status";
import { saveStaff } from "../actions";

export async function generateMetadata({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  const s = await db.staffMember.findUnique({ where: { id }, select: { name: true } });
  return { title: s?.name ?? "Staff" };
}

export default async function StaffMemberPage({ params }: PageProps<"/staff/[id]">) {
  const { id } = await params;
  const [s, { today }] = await Promise.all([
    db.staffMember.findUnique({
      where: { id },
      include: { assignments: { include: { event: { select: { id: true, name: true, date: true, status: true } } }, orderBy: { event: { date: "desc" } } } },
    }),
    getToday(),
  ]);
  if (!s) notFound();
  const year = today.slice(0, 4);
  const paidYtd = s.assignments.filter((a) => a.status === "PAID" && toISODate(a.event.date).startsWith(year)).reduce((sum, a) => sum + (a.actualPayCents ?? assignmentCost(a)), 0);
  const owed = s.assignments.filter((a) => a.status === "COMPLETED").reduce((sum, a) => sum + (a.actualPayCents ?? assignmentCost(a)), 0);
  const upcoming = s.assignments.filter((a) => toISODate(a.event.date) >= today).reverse();
  const past = s.assignments.filter((a) => toISODate(a.event.date) < today);

  const Row = ({ a }: { a: (typeof s.assignments)[number] }) => (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Link href={`/events/${a.event.id}?tab=staff`} className="font-medium hover:text-wine">{a.event.name}</Link>
        <div className="text-xs text-ink-3">{formatDate.medium(toISODate(a.event.date))} · {STAFF_ROLE[a.role]}{a.callTime ? ` · ${formatTime(a.callTime)}–${formatTime(a.endTime)}` : ""} · {assignmentHours(a).toFixed(1)}h</div>
      </div>
      <span className="text-sm tabular">{formatMoney(a.actualPayCents ?? assignmentCost(a))}</span>
      <AssignmentStatusSelect id={a.id} status={a.status} filled />
    </li>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          <Avatar name={s.name} className="h-16 w-16 text-2xl" />
          <div>
            <div className="eyebrow mb-1"><Link href="/staff" className="hover:text-wine">Staff</Link></div>
            <h1 className="font-display text-[2.4rem] leading-tight">{s.name}</h1>
            <div className="text-sm text-ink-3">{STAFF_ROLE[s.role]} · {formatMoney(s.rateCents)}{s.rateType === "HOURLY" ? " per hour" : " per event"}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.phone && <a href={`sms:${s.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong/70 bg-linen px-4 text-sm font-medium"><MessageSquare className="h-4 w-4" />Text</a>}
          {s.phone && <a href={`tel:${s.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong/70 bg-linen px-4 text-sm font-medium"><Phone className="h-4 w-4" />Call</a>}
          {s.email && <a href={`mailto:${s.email}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong/70 bg-linen px-4 text-sm font-medium"><Mail className="h-4 w-4" />Email</a>}
          <ActionDialog trigger={<><Pencil className="h-4 w-4" />Edit</>} title="Edit team member" action={saveStaff} hidden={{ id }}><StaffFields s={s} editing /></ActionDialog>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card><CardHeader title="Upcoming" /><CardBody>{upcoming.length ? <ul className="divide-y divide-line/70">{upcoming.map((a) => <Row key={a.id} a={a} />)}</ul> : <p className="text-sm text-ink-4">Nothing scheduled.</p>}</CardBody></Card>
          <Card><CardHeader title="History" /><CardBody>{past.length ? <ul className="divide-y divide-line/70">{past.map((a) => <Row key={a.id} a={a} />)}</ul> : <p className="text-sm text-ink-4">No past events.</p>}</CardBody></Card>
        </div>
        <aside className="space-y-4">
          <Card><CardBody className="grid grid-cols-2 gap-4 pt-5">
            <div><div className="text-xs text-ink-3">Paid {year}</div><div className="font-display text-2xl tabular">{formatMoney(paidYtd)}</div></div>
            <div><div className="text-xs text-ink-3">Owed</div><div className={`font-display text-2xl tabular ${owed ? "text-amber" : ""}`}>{formatMoney(owed)}</div></div>
          </CardBody></Card>
          {[["Availability", s.availabilityNotes], ["Reliability", s.reliabilityNotes], ["Notes", s.notes]].filter(([, v]) => v).map(([k, v]) => (
            <Card key={k} className="bg-sand/40"><CardBody className="pt-5"><div className="eyebrow mb-1">{k}</div><p className="text-sm text-ink-2">{v}</p></CardBody></Card>
          ))}
          <div className="px-1"><StatusDot tone={s.active ? "sage" : "neutral"}>{s.active ? "Active" : "Inactive"}</StatusDot></div>
          <p className="px-1 text-xs text-ink-4">{metaOf(STAFF_STATUS, "PAID").label} status records the pay date automatically.</p>
        </aside>
      </div>
    </div>
  );
}
