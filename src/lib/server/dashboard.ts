import "server-only";
import { db } from "./db";
import { loadEventSummaries, toAttentionEvent } from "./events";
import { computeAttention } from "@/lib/domain/attention";
import { addDays, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";

const ACTIVE = ["TENTATIVE", "BOOKED", "PLANNING", "READY"] as const;

export async function getDashboard(today: ISODate) {
  const [events, leads] = await Promise.all([
    // Upcoming work plus recent past events that may still need closing out or collecting.
    loadEventSummaries({ date: { gte: fromISODate(addDays(today, -60)) }, status: { not: "CANCELLED" } }, today),
    db.lead.findMany({
      where: { status: { notIn: ["BOOKED", "LOST"] } },
      select: { id: true, name: true, status: true, nextFollowUpDate: true, createdAt: true, lastContactedAt: true, eventDate: true, estimatedValueCents: true },
    }),
  ]);

  const in30 = addDays(today, 30);
  const active = events.filter((e) => (ACTIVE as readonly string[]).includes(e.status));
  const upcoming = active.filter((e) => e.date >= today);
  const next30 = upcoming.filter((e) => e.date <= in30);

  const outstanding = events.filter((e) => e.payment.balanceCents > 0 && e.status !== "TENTATIVE");
  const attention = computeAttention(
    events.map(toAttentionEvent),
    leads.map((l) => ({
      id: l.id,
      name: l.name,
      status: l.status,
      nextFollowUpDate: l.nextFollowUpDate ? toISODate(l.nextFollowUpDate) : null,
      createdDate: l.createdAt.toISOString().slice(0, 10),
      lastContacted: !!l.lastContactedAt,
      eventDate: l.eventDate ? toISODate(l.eventDate) : null,
    })),
    today,
  );

  const thisWeek = upcoming.filter((e) => e.date <= addDays(today, 6));

  return {
    attention,
    upcoming: upcoming.slice(0, 6),
    thisWeek,
    snapshot: {
      upcomingRevenueCents: next30.reduce((s, e) => s + e.priceCents, 0),
      upcomingProfitCents: next30.reduce((s, e) => s + e.projection.profitCents, 0),
      next30Count: next30.length,
      next30Guests: next30.reduce((s, e) => s + e.guestCount, 0),
      outstandingCents: outstanding.reduce((s, e) => s + e.payment.balanceCents, 0),
      outstandingCount: outstanding.length,
      overdueCents: outstanding
        .filter((e) => (e.payment.depositOutstandingCents > 0 ? (e.depositDueDate ?? today) : (e.balanceDueDate ?? e.date)) < today)
        .reduce((s, e) => s + e.payment.balanceCents, 0),
      activeLeads: leads.length,
      pipelineCents: leads.reduce((s, l) => s + (l.estimatedValueCents ?? 0), 0),
      newLeads: leads.filter((l) => l.status === "NEW").length,
    },
  };
}
