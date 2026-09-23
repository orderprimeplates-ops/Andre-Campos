import "server-only";
import { db } from "./db";
import { toISODate } from "@/lib/domain/dates";

export interface EquipmentConflict {
  itemId: string;
  name: string;
  needed: number;
  neededOnDate: number;
  available: number;
  shortBy: number;
  otherEvents: string[];
}

/**
 * Warns when an event needs more of an item than Prime Plates owns — including what other
 * events on the same day(s) have already claimed.
 */
export async function equipmentConflicts(eventId: string): Promise<EquipmentConflict[]> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { date: true, endDate: true, equipment: { include: { equipmentItem: true } } },
  });
  if (!event || event.equipment.length === 0) return [];
  const start = event.date;
  const end = event.endDate ?? event.date;
  const overlapping = await db.eventEquipment.findMany({
    where: {
      eventId: { not: eventId },
      equipmentItemId: { in: event.equipment.map((e) => e.equipmentItemId) },
      event: {
        status: { notIn: ["CANCELLED", "COMPLETED"] },
        date: { lte: end },
        OR: [{ endDate: null, date: { gte: start } }, { endDate: { gte: start } }],
      },
    },
    include: { event: { select: { name: true, date: true } } },
  });
  const out: EquipmentConflict[] = [];
  for (const use of event.equipment) {
    const item = use.equipmentItem;
    const available = item.quantityOwned - item.quantityOutOfService;
    const others = overlapping.filter((o) => o.equipmentItemId === item.id);
    const neededOnDate = use.quantity + others.reduce((s, o) => s + o.quantity, 0);
    if (neededOnDate > available) {
      out.push({
        itemId: item.id, name: item.name, needed: use.quantity, neededOnDate, available, shortBy: neededOnDate - available,
        otherEvents: others.map((o) => `${o.event.name} (${toISODate(o.event.date)})`),
      });
    }
  }
  return out;
}
