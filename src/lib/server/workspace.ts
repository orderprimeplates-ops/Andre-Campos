import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { eventSummaryInclude, summarizeEvent } from "./events";
import { menuInclude } from "@/lib/mappers";
import type { ISODate } from "@/lib/domain/dates";

export const workspaceInclude = {
  ...eventSummaryInclude,
  client: true,
  menu: { include: menuInclude },
  guestNotes: { orderBy: { createdAt: "asc" } },
  staffAssignments: { include: { staffMember: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  equipment: { include: { equipmentItem: true }, orderBy: { equipmentItem: { name: "asc" } } },
  shoppingStates: { include: { vendor: true } },
  shoppingExtras: { include: { vendor: true }, orderBy: { createdAt: "asc" } },
  prepTasks: { include: { recipe: { select: { id: true, name: true } }, dish: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  runOfShow: { orderBy: [{ time: "asc" }, { sortOrder: "asc" }] },
  payments: { orderBy: { receivedOn: "asc" } },
  expenses: { orderBy: { createdAt: "asc" } },
  review: true,
  lead: { select: { id: true, name: true, source: true } },
} satisfies Prisma.EventInclude;

export type WorkspaceEvent = Prisma.EventGetPayload<{ include: typeof workspaceInclude }>;

export async function getEventWorkspace(id: string, today: ISODate) {
  const [event, settings] = await Promise.all([db.event.findUnique({ where: { id }, include: workspaceInclude }), getSettings()]);
  if (!event) return null;
  // The summary expects only projected expenses; hand it the filtered view.
  const summary = summarizeEvent(
    { ...event, expenses: event.expenses.filter((x) => x.kind === "PROJECTED") } as unknown as Parameters<typeof summarizeEvent>[0],
    settings,
    today,
  );
  return { event, summary, settings };
}
