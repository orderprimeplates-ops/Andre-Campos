"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getSettings, getToday } from "@/lib/server/settings";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { EventStatus, EventType, ServiceStyle } from "@/generated/prisma/enums";
import { addDays, daysBetween, fromISODate, toISODate } from "@/lib/domain/dates";

const refresh = () => revalidatePath("/", "layout");

export async function createEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const [settings, { today }] = await Promise.all([getSettings(), getToday()]);
  let id = "";
  const res = await attempt(async () => {
    const date = form.date(fd, "date");
    if (!date) throw new FormError("Pick the event date.");
    const guestCount = form.int(fd, "guestCount");
    if (!guestCount || guestCount < 1) throw new FormError("Enter a guest count.");
    let clientId = form.str(fd, "clientId");
    if (!clientId || clientId === "new") {
      const name = form.str(fd, "newClientName");
      if (!name) throw new FormError("Choose a client or enter a new client’s name.");
      clientId = (await db.client.create({ data: { name, phone: form.str(fd, "newClientPhone"), email: form.str(fd, "newClientEmail") } })).id;
    }
    const iso = toISODate(date);
    const priceCents = form.money(fd, "price") ?? 0;
    const event = await db.event.create({
      data: {
        name: form.req(fd, "name", "Event name"),
        clientId,
        eventType: form.enumOf(fd, "eventType", EventType) ?? "PRIVATE_DINNER",
        serviceStyle: form.enumOf(fd, "serviceStyle", ServiceStyle) ?? "PLATED",
        status: form.enumOf(fd, "status", EventStatus) ?? "BOOKED",
        date,
        arrivalTime: form.time(fd, "arrivalTime"),
        serviceTime: form.time(fd, "serviceTime"),
        endTime: form.time(fd, "endTime"),
        guestCount,
        platformId: form.str(fd, "platformId"),
        venueId: form.str(fd, "venueId"),
        priceCents,
        depositCents: Math.round((priceCents * settings.defaultDepositPct) / 100),
        depositDueDate: fromISODate(addDays(today, 3)),
        balanceDueDate: fromISODate(addDays(iso, -3)),
        finalCountDueDate: fromISODate(addDays(iso, -settings.finalCountLeadDays)),
        shoppingDate: daysBetween(today, iso) > 1 ? fromISODate(addDays(iso, -1)) : null,
        prepStartDate: daysBetween(today, iso) > 2 ? fromISODate(addDays(iso, -2)) : null,
        description: form.str(fd, "description"),
        menu: { create: { status: "DRAFT" } },
      },
    });
    id = event.id;
  });
  if (res?.error) return res;
  refresh();
  redirect(`/events/${id}`);
}

export async function updateEventDetails(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const id = form.req(fd, "id");
    const date = form.date(fd, "date");
    if (!date) throw new FormError("The event needs a date.");
    const guestCount = form.int(fd, "guestCount");
    if (!guestCount || guestCount < 1) throw new FormError("Enter a guest count.");
    await db.event.update({
      where: { id },
      data: {
        name: form.req(fd, "name", "Event name"),
        eventType: form.enumOf(fd, "eventType", EventType) ?? undefined,
        serviceStyle: form.enumOf(fd, "serviceStyle", ServiceStyle) ?? undefined,
        status: form.enumOf(fd, "status", EventStatus) ?? undefined,
        date,
        endDate: form.date(fd, "endDate"),
        arrivalTime: form.time(fd, "arrivalTime"),
        serviceTime: form.time(fd, "serviceTime"),
        endTime: form.time(fd, "endTime"),
        guestCount,
        guestCountConfirmed: form.bool(fd, "guestCountConfirmed"),
        finalCountDueDate: form.date(fd, "finalCountDueDate"),
        platformId: form.str(fd, "platformId"),
        priceCents: form.money(fd, "price") ?? 0,
        depositCents: form.money(fd, "deposit") ?? 0,
        depositDueDate: form.date(fd, "depositDueDate"),
        balanceDueDate: form.date(fd, "balanceDueDate"),
        shoppingDate: form.date(fd, "shoppingDate"),
        prepStartDate: form.date(fd, "prepStartDate"),
        roundTripMiles: form.num(fd, "roundTripMiles"),
        description: form.str(fd, "description"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function setEventStatus(id: string, status: EventStatus) {
  await requireUser();
  await db.event.update({ where: { id }, data: { status } });
  refresh();
}

/** Guest count flows into recipe scaling, shopping, food cost and margin automatically. */
export async function setGuestCount(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const guestCount = form.int(fd, "guestCount");
    if (!guestCount || guestCount < 1) throw new FormError("Enter a guest count.");
    await db.event.update({
      where: { id: form.req(fd, "id") },
      data: { guestCount, guestCountConfirmed: form.bool(fd, "guestCountConfirmed") },
    });
    refresh();
    return { ok: true, message: "Guest count updated — quantities, shopping and costs have been recalculated." };
  });
}

export async function updateEventNotes(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.event.update({
      where: { id: form.req(fd, "id") },
      data: {
        criticalNotes: form.str(fd, "criticalNotes"),
        internalNotes: form.str(fd, "internalNotes"),
        dietarySummary: form.str(fd, "dietarySummary"),
      },
    });
    refresh();
    return { ok: true, message: "Saved." };
  });
}

export async function deleteEvent(id: string) {
  await requireUser();
  await db.lead.updateMany({ where: { eventId: id }, data: { eventId: null } });
  await db.event.delete({ where: { id } });
  refresh();
  redirect("/events");
}

/**
 * Duplicate an event for a repeat booking: copies menu, staffing needs, equipment, prep
 * structure and run of show. Quantities and costs recalculate from the new guest count
 * automatically because they are never stored.
 */
export async function duplicateEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const settings = await getSettings();
  const { today } = await getToday();
  let newId = "";
  const res = await attempt(async () => {
    const sourceId = form.req(fd, "sourceId");
    const date = form.date(fd, "date");
    if (!date) throw new FormError("Pick a date for the new event.");
    const guestCount = form.int(fd, "guestCount");
    if (!guestCount || guestCount < 1) throw new FormError("Enter a guest count.");
    const src = await db.event.findUniqueOrThrow({
      where: { id: sourceId },
      include: {
        menu: { include: { courses: { include: { items: true } } } },
        staffAssignments: true,
        equipment: true,
        prepTasks: true,
        runOfShow: true,
        expenses: { where: { kind: "PROJECTED" } },
        guestNotes: true,
      },
    });
    const iso = toISODate(date);
    const srcIso = toISODate(src.date);
    const shift = (d: Date | null) => (d ? fromISODate(addDays(iso, daysBetween(srcIso, toISODate(d)))) : null);
    const scale = guestCount / src.guestCount;
    const priceCents = form.money(fd, "price") ?? Math.round(src.priceCents * scale);
    const keepVenue = form.bool(fd, "keepVenue");
    const clientId = form.str(fd, "clientId") ?? src.clientId;

    newId = await db.$transaction(async (tx) => {
      const ev = await tx.event.create({
        data: {
          name: form.req(fd, "name", "Event name"),
          clientId,
          venueId: keepVenue ? src.venueId : null,
          platformId: src.platformId,
          eventType: src.eventType,
          serviceStyle: src.serviceStyle,
          status: "BOOKED",
          date,
          endDate: shift(src.endDate),
          arrivalTime: src.arrivalTime,
          serviceTime: src.serviceTime,
          endTime: src.endTime,
          guestCount,
          priceCents,
          depositCents: Math.round((priceCents * settings.defaultDepositPct) / 100),
          depositDueDate: fromISODate(addDays(today, 3)),
          balanceDueDate: fromISODate(addDays(iso, -3)),
          finalCountDueDate: fromISODate(addDays(iso, -settings.finalCountLeadDays)),
          shoppingDate: shift(src.shoppingDate),
          prepStartDate: shift(src.prepStartDate),
          roundTripMiles: keepVenue ? src.roundTripMiles : null,
          description: src.description,
          criticalNotes: clientId === src.clientId ? src.criticalNotes : null,
          dietarySummary: clientId === src.clientId ? src.dietarySummary : null,
          duplicatedFromId: src.id,
          menu: src.menu
            ? {
                create: {
                  status: "DRAFT",
                  title: src.menu.title,
                  courses: {
                    create: src.menu.courses.map((c) => ({
                      name: c.name, fireTime: c.fireTime, sortOrder: c.sortOrder,
                      items: {
                        create: c.items.map((i) => ({
                          dishId: i.dishId, sortOrder: i.sortOrder, notes: i.notes, portionsPerGuest: i.portionsPerGuest,
                          guestCount: i.guestCount ? Math.max(1, Math.round(i.guestCount * scale)) : null,
                        })),
                      },
                    })),
                  },
                },
              }
            : { create: { status: "DRAFT" } },
          staffAssignments: {
            create: src.staffAssignments.map((a) => ({
              staffMemberId: form.bool(fd, "keepStaff") ? a.staffMemberId : null,
              role: a.role, rateCents: a.rateCents, rateType: a.rateType, callTime: a.callTime, endTime: a.endTime,
              responsibilities: a.responsibilities, sortOrder: a.sortOrder, status: "NEEDED",
            })),
          },
          equipment: { create: src.equipment.map((e) => ({ equipmentItemId: e.equipmentItemId, quantity: e.quantity, notes: e.notes })) },
          prepTasks: {
            create: src.prepTasks.map((t) => ({
              title: t.title, phase: t.phase, recipeId: t.recipeId, dishId: t.dishId, estimatedMinutes: t.estimatedMinutes,
              notes: t.notes, sortOrder: t.sortOrder, generated: t.generated, assigneeId: form.bool(fd, "keepStaff") ? t.assigneeId : null,
            })),
          },
          runOfShow: {
            create: src.runOfShow.map((r) => ({ time: r.time, title: r.title, kind: r.kind, details: r.details, sortOrder: r.sortOrder, doneLines: [] })),
          },
          expenses: {
            create: src.expenses.map((x) => ({ kind: "PROJECTED" as const, category: x.category, description: x.description, vendor: x.vendor, amountCents: x.amountCents })),
          },
          guestNotes: clientId === src.clientId
            ? { create: src.guestNotes.map((g) => ({ guestName: g.guestName, restriction: g.restriction, severity: g.severity, count: g.count, notes: g.notes })) }
            : undefined,
        },
      });
      return ev.id;
    });
  });
  if (res?.error) return res;
  refresh();
  redirect(`/events/${newId}`);
}

export async function saveReview(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const data = {
      rating: form.int(fd, "rating"),
      wentWell: form.str(fd, "wentWell"),
      wentWrong: form.str(fd, "wentWrong"),
      clientLoved: form.str(fd, "clientLoved"),
      changeNextTime: form.str(fd, "changeNextTime"),
      ranOut: form.str(fd, "ranOut"),
      excessLeftovers: form.str(fd, "excessLeftovers"),
      serveMenuAgain: form.tri(fd, "serveMenuAgain"),
      takeClientAgain: form.tri(fd, "takeClientAgain"),
      operationalNotes: form.str(fd, "operationalNotes"),
    };
    await db.eventReview.upsert({ where: { eventId }, create: { eventId, ...data }, update: data });
    refresh();
    return { ok: true, message: "Review saved." };
  });
}
