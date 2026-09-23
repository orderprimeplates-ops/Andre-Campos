import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { toISODate } from "@/lib/domain/dates";
import { LiveMode } from "@/components/live/live-mode";

export const metadata = { title: "Day-of mode" };

export default async function LivePage({ params }: PageProps<"/events/[id]/live">) {
  const { id } = await params;
  const [e, { today, timezone }] = await Promise.all([
    db.event.findUnique({
      where: { id },
      include: {
        client: { select: { name: true, allergies: true } },
        venue: true,
        runOfShow: { orderBy: [{ time: "asc" }, { sortOrder: "asc" }] },
        staffAssignments: { include: { staffMember: true }, orderBy: { callTime: "asc" } },
        menu: { include: { courses: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" }, include: { dish: { select: { name: true, platingDifficulty: true } } } } } } } },
        guestNotes: true,
        prepTasks: { where: { phase: { in: ["ON_SITE", "BEFORE_DEPARTURE"] } }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, status: true, phase: true } },
      },
    }),
    getToday(),
  ]);
  if (!e) notFound();
  return (
    <LiveMode
      data={{
        id: e.id,
        name: e.name,
        clientName: e.client.name,
        date: toISODate(e.date),
        isToday: toISODate(e.date) === today,
        timezone,
        guestCount: e.guestCount,
        arrivalTime: e.arrivalTime,
        serviceTime: e.serviceTime,
        endTime: e.endTime,
        criticalNotes: e.criticalNotes,
        dietarySummary: e.dietarySummary,
        allergies: [
          ...e.guestNotes.filter((g) => g.severity !== "PREFERENCE").map((g) => `${g.restriction}${g.guestName ? ` — ${g.guestName}` : g.count > 1 ? ` × ${g.count}` : ""}${g.severity === "SEVERE_ALLERGY" ? " (SEVERE)" : ""}`),
        ],
        venue: e.venue ? { name: e.venue.name, address: [e.venue.address, e.venue.city].filter(Boolean).join(", "), gateCode: e.venue.gateCode, parking: e.venue.parkingInstructions, contactName: e.venue.contactName, contactPhone: e.venue.contactPhone, oven: e.venue.ovenNotes, electrical: e.venue.electricalNotes } : null,
        run: e.runOfShow.map((r) => ({ id: r.id, time: r.time, title: r.title, kind: r.kind, lines: (r.details ?? "").split("\n").filter(Boolean), doneLines: r.doneLines, done: r.done })),
        courses: (e.menu?.courses ?? []).map((c) => ({ name: c.name, fireTime: c.fireTime, dishes: c.items.map((i) => `${i.dish.name}${i.guestCount ? ` × ${i.guestCount}` : ""}`) })),
        staff: e.staffAssignments.filter((a) => a.staffMember).map((a) => ({ name: a.staffMember!.name, role: a.role, callTime: a.callTime, phone: a.staffMember!.phone, status: a.status })),
      }}
    />
  );
}
