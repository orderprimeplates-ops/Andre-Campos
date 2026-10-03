import "server-only";
import { db } from "./db";
import { toISODate } from "@/lib/domain/dates";
import type { StaffBriefSource } from "@/lib/staff-brief";

/**
 * Loads ONLY the operational fields a staff brief may contain. Every field is listed explicitly
 * (no `include`), so prices, payments, costs, pay rates and internal notes are never read here.
 */
export async function loadStaffBriefSource(eventId: string): Promise<StaffBriefSource | null> {
  const e = await db.event.findUnique({
    where: { id: eventId },
    select: {
      name: true, date: true, arrivalTime: true, serviceTime: true, endTime: true, guestCount: true, serviceStyle: true,
      dietarySummary: true, criticalNotes: true, staffNotes: true,
      client: { select: { name: true, allergies: true, dietaryRestrictions: true } },
      venue: {
        select: {
          name: true, address: true, city: true, state: true, gateCode: true, parkingInstructions: true, contactName: true, contactPhone: true,
          ovenNotes: true, electricalNotes: true, outdoorCooking: true, otherNotes: true,
        },
      },
      runOfShow: { select: { time: true, title: true, kind: true, details: true }, orderBy: [{ time: "asc" }, { sortOrder: "asc" }] },
      menu: {
        select: {
          courses: {
            orderBy: { sortOrder: "asc" },
            select: { name: true, fireTime: true, items: { orderBy: { sortOrder: "asc" }, select: { notes: true, guestCount: true, dish: { select: { name: true, description: true } } } } },
          },
        },
      },
      guestNotes: { select: { guestName: true, restriction: true, severity: true, count: true, notes: true }, orderBy: { createdAt: "asc" } },
      staffAssignments: {
        select: { role: true, callTime: true, endTime: true, responsibilities: true, staffMember: { select: { name: true, phone: true } } },
        orderBy: [{ callTime: "asc" }, { sortOrder: "asc" }],
      },
      equipment: { select: { quantity: true, status: true, notes: true, equipmentItem: { select: { name: true, category: true } } }, orderBy: { equipmentItem: { name: "asc" } } },
      prepTasks: { where: { phase: { in: ["BEFORE_DEPARTURE", "ON_SITE"] } }, select: { title: true, phase: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!e) return null;
  return {
    name: e.name,
    clientName: e.client.name,
    date: toISODate(e.date),
    arrivalTime: e.arrivalTime,
    serviceTime: e.serviceTime,
    endTime: e.endTime,
    guestCount: e.guestCount,
    serviceStyle: e.serviceStyle,
    dietarySummary: e.dietarySummary,
    criticalNotes: e.criticalNotes,
    staffNotes: e.staffNotes,
    clientAllergies: e.client.allergies,
    clientDietary: e.client.dietaryRestrictions,
    venue: e.venue,
    runOfShow: e.runOfShow,
    courses: (e.menu?.courses ?? []).map((c) => ({
      name: c.name,
      fireTime: c.fireTime,
      items: c.items.map((i) => ({ dish: i.dish.name, description: i.dish.description, notes: i.notes, guestCount: i.guestCount })),
    })),
    guestNotes: e.guestNotes,
    staff: e.staffAssignments.map((a) => ({ name: a.staffMember?.name ?? null, role: a.role, callTime: a.callTime, endTime: a.endTime, responsibilities: a.responsibilities, phone: a.staffMember?.phone ?? null })),
    equipment: e.equipment.map((x) => ({ name: x.equipmentItem.name, category: x.equipmentItem.category, quantity: x.quantity, status: x.status, notes: x.notes })),
    prepTasks: e.prepTasks,
  };
}
