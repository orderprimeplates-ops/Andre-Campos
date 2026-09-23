import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { PREP_PHASES } from "@/lib/domain/planning";
import { addDays, formatDate, fromISODate, relativeDay, toISODate, type ISODate } from "@/lib/domain/dates";
import { PREP_PHASE } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { PrepToggle } from "@/components/prep/prep-toggle";

export const metadata = { title: "Prep" };

const OFFSET = Object.fromEntries(PREP_PHASES.map((p) => [p.key, p.offsetDays ?? 0]));

function hours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

/** Every prep task across upcoming events, laid out on the day it should happen. */
export default async function PrepPage() {
  const { today } = await getToday();
  const tasks = await db.prepTask.findMany({
    where: { event: { status: { in: ["BOOKED", "PLANNING", "READY", "TENTATIVE"] }, date: { gte: fromISODate(today), lte: fromISODate(addDays(today, 21)) } } },
    include: { event: { select: { id: true, name: true, date: true } }, assignee: { select: { name: true } } },
    orderBy: [{ sortOrder: "asc" }],
  });
  const byDay = new Map<ISODate, typeof tasks>();
  for (const t of tasks) {
    const d = addDays(toISODate(t.event.date), OFFSET[t.phase]);
    const key = d < today && t.status !== "COMPLETE" ? today : d; // overdue work rolls onto today
    byDay.set(key, [...(byDay.get(key) ?? []), t]);
  }
  const days = [...byDay.keys()].filter((d) => d >= today).sort();
  const open = tasks.filter((t) => t.status !== "COMPLETE");

  return (
    <div>
      <PageHeader eyebrow="Operations" title="Prep" description={`${open.length} open task${open.length === 1 ? "" : "s"} across the next three weeks · about ${hours(open.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0))} of work`} />
      {days.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No prep scheduled">Generate a prep plan from any event’s Prep tab.</EmptyState>
      ) : (
        <div className="space-y-6">
          {days.map((d) => {
            const list = byDay.get(d)!;
            const mins = list.filter((t) => t.status !== "COMPLETE").reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
            const events = [...new Map(list.map((t) => [t.event.id, t.event])).values()];
            return (
              <section key={d}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="font-display text-2xl">{relativeDay(d, today)} <span className="text-base text-ink-3">· {formatDate.medium(d)}</span></h2>
                  <span className="text-xs text-ink-3">{list.filter((t) => t.status === "COMPLETE").length}/{list.length}{mins ? ` · ${hours(mins)} left` : ""}</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {events.map((ev) => (
                    <Card key={ev.id} className="overflow-hidden">
                      <Link href={`/events/${ev.id}?tab=prep`} className="block border-b border-line/70 bg-sand/40 px-4 py-2.5 text-sm font-medium hover:text-wine">
                        {ev.name} <span className="font-normal text-ink-3">· event {formatDate.short(toISODate(ev.date))}</span>
                      </Link>
                      <div className="divide-y divide-line/60">
                        {list.filter((t) => t.event.id === ev.id).map((t) => (
                          <PrepToggle key={t.id} id={t.id} status={t.status} title={t.title}
                            meta={[PREP_PHASE[t.phase], t.estimatedMinutes ? hours(t.estimatedMinutes) : null, t.assignee?.name].filter(Boolean).join(" · ")} />
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
