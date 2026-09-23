"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getSettings, getToday } from "@/lib/server/settings";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { EventType, LeadSource, LeadStatus, LostReason, ServiceStyle } from "@/generated/prisma/enums";
import { addDays, fromISODate, toISODate } from "@/lib/domain/dates";

function leadData(fd: FormData) {
  return {
    name: form.req(fd, "name", "Name"),
    phone: form.str(fd, "phone"),
    email: form.str(fd, "email"),
    eventDate: form.date(fd, "eventDate"),
    location: form.str(fd, "location"),
    guestCount: form.int(fd, "guestCount"),
    eventType: form.enumOf(fd, "eventType", EventType),
    requestedService: form.str(fd, "requestedService"),
    budgetCents: form.money(fd, "budget"),
    cuisineRequest: form.str(fd, "cuisineRequest"),
    dietaryRestrictions: form.str(fd, "dietaryRestrictions"),
    source: form.enumOf(fd, "source", LeadSource) ?? "OTHER",
    platformId: form.str(fd, "platformId"),
    notes: form.str(fd, "notes"),
    estimatedValueCents: form.money(fd, "estimatedValue"),
    nextFollowUpDate: form.date(fd, "nextFollowUpDate"),
  };
}

export async function createLead(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  let id = "";
  const res = await attempt(async () => {
    const lead = await db.lead.create({ data: { ...leadData(fd), status: "NEW", boardOrder: -Date.now() } });
    id = lead.id;
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  redirect(`/leads/${id}`);
}

export async function updateLead(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const id = form.req(fd, "id");
    await db.lead.update({ where: { id }, data: leadData(fd) });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/** Move a lead on the pipeline board. */
export async function setLeadStatus(id: string, status: LeadStatus, boardOrder?: number) {
  await requireUser();
  if (!Object.values(LeadStatus).includes(status)) return;
  const data: { status: LeadStatus; boardOrder?: number; lastContactedAt?: Date; lostReason?: null } = { status };
  if (boardOrder !== undefined) data.boardOrder = boardOrder;
  if (status !== "NEW") {
    const lead = await db.lead.findUnique({ where: { id }, select: { lastContactedAt: true } });
    if (!lead?.lastContactedAt) data.lastContactedAt = new Date();
  }
  if (status !== "LOST") data.lostReason = null;
  await db.lead.update({ where: { id }, data });
  revalidatePath("/", "layout");
}

export async function markLost(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const id = form.req(fd, "id");
    await db.lead.update({
      where: { id },
      data: { status: "LOST", lostReason: form.enumOf(fd, "lostReason", LostReason) ?? "OTHER", lostNotes: form.str(fd, "lostNotes"), nextFollowUpDate: null },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/** "I just reached out" — logs contact and schedules the next nudge. */
export async function logContact(id: string, followUpInDays: number | null) {
  await requireUser();
  const { today } = await getToday();
  const lead = await db.lead.findUniqueOrThrow({ where: { id }, select: { status: true } });
  await db.lead.update({
    where: { id },
    data: {
      lastContactedAt: new Date(),
      status: lead.status === "NEW" ? "CONTACTED" : lead.status,
      nextFollowUpDate: followUpInDays === null ? null : fromISODate(addDays(today, followUpInDays)),
    },
  });
  revalidatePath("/", "layout");
}

export async function deleteLead(id: string) {
  await requireUser();
  await db.lead.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/leads");
}

/**
 * Booked! Creates (or reuses) the client, creates the event with everything the lead already
 * knew, starts a draft menu, and links it all together.
 */
export async function convertLead(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  const [settings, { today }] = await Promise.all([getSettings(), getToday()]);
  let eventId = "";
  const res = await attempt(async () => {
    const leadId = form.req(fd, "leadId");
    const lead = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
    if (lead.eventId) throw new FormError("This lead has already been converted.");
    const date = form.date(fd, "date");
    if (!date) throw new FormError("The event needs a date.");
    const guestCount = form.int(fd, "guestCount");
    if (!guestCount || guestCount < 1) throw new FormError("Enter the guest count.");
    const priceCents = form.money(fd, "price") ?? 0;
    const depositPct = form.num(fd, "depositPct") ?? settings.defaultDepositPct;
    const existingClientId = form.str(fd, "clientId");
    const isoDate = toISODate(date);

    eventId = await db.$transaction(async (tx) => {
      const clientId =
        existingClientId && existingClientId !== "new"
          ? existingClientId
          : (
              await tx.client.create({
                data: {
                  name: form.str(fd, "clientName") ?? lead.name,
                  phone: lead.phone,
                  email: lead.email,
                  dietaryRestrictions: lead.dietaryRestrictions,
                  referralSource: lead.source,
                },
              })
            ).id;
      const venueName = form.str(fd, "venueName");
      const venue = venueName
        ? await tx.venue.create({ data: { name: venueName, address: form.str(fd, "venueAddress"), city: form.str(fd, "venueCity"), clientId } })
        : null;
      const event = await tx.event.create({
        data: {
          name: form.req(fd, "eventName", "Event name"),
          clientId,
          venueId: venue?.id,
          platformId: form.str(fd, "platformId") ?? lead.platformId,
          eventType: form.enumOf(fd, "eventType", EventType) ?? lead.eventType ?? "PRIVATE_DINNER",
          serviceStyle: form.enumOf(fd, "serviceStyle", ServiceStyle) ?? "PLATED",
          status: "BOOKED",
          date,
          serviceTime: form.time(fd, "serviceTime"),
          guestCount,
          priceCents,
          depositCents: Math.round((priceCents * depositPct) / 100),
          depositDueDate: fromISODate(addDays(today, 3)),
          balanceDueDate: fromISODate(addDays(isoDate, -3)),
          finalCountDueDate: fromISODate(addDays(isoDate, -settings.finalCountLeadDays)),
          dietarySummary: lead.dietaryRestrictions,
          description: [lead.requestedService, lead.cuisineRequest && `Cuisine request: ${lead.cuisineRequest}`].filter(Boolean).join("\n") || null,
          internalNotes: lead.notes,
          menu: { create: { status: "DRAFT" } },
        },
      });
      await tx.lead.update({ where: { id: leadId }, data: { status: "BOOKED", clientId, eventId: event.id, nextFollowUpDate: null } });
      return event.id;
    });
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  redirect(`/events/${eventId}`);
}
