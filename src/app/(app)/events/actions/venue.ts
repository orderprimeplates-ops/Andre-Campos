"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { Availability, DietarySeverity, SpaceLevel } from "@/generated/prisma/enums";

const refresh = () => revalidatePath("/", "layout");

export async function assignVenue(eventId: string, venueId: string | null) {
  await requireUser();
  await db.event.update({ where: { id: eventId }, data: { venueId } });
  refresh();
}

export async function createVenueForEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const venue = await db.venue.create({
      data: {
        name: form.req(fd, "name", "Venue name"),
        clientId: form.bool(fd, "clientOwned") ? form.str(fd, "clientId") : null,
        address: form.str(fd, "address"),
        city: form.str(fd, "city"),
        state: form.str(fd, "state"),
        postalCode: form.str(fd, "postalCode"),
      },
    });
    await db.event.update({ where: { id: eventId }, data: { venueId: venue.id } });
    refresh();
    return { ok: true };
  });
}

/** Saves the whole kitchen checklist. Blank answers stay "unknown" so readiness stays honest. */
export async function updateVenueKitchen(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.venue.update({
      where: { id: form.req(fd, "venueId") },
      data: {
        name: form.req(fd, "name", "Venue name"),
        address: form.str(fd, "address"),
        city: form.str(fd, "city"),
        state: form.str(fd, "state"),
        postalCode: form.str(fd, "postalCode"),
        parkingInstructions: form.str(fd, "parkingInstructions"),
        gateCode: form.str(fd, "gateCode"),
        contactName: form.str(fd, "contactName"),
        contactPhone: form.str(fd, "contactPhone"),
        stoveType: form.str(fd, "stoveType"),
        burnerCount: form.int(fd, "burnerCount"),
        hasOven: form.tri(fd, "hasOven"),
        ovenNotes: form.str(fd, "ovenNotes"),
        hasGrill: form.tri(fd, "hasGrill"),
        hasMicrowave: form.tri(fd, "hasMicrowave"),
        fridgeSpace: form.enumOf(fd, "fridgeSpace", SpaceLevel),
        freezerSpace: form.enumOf(fd, "freezerSpace", SpaceLevel),
        counterSpace: form.enumOf(fd, "counterSpace", SpaceLevel),
        hasSink: form.tri(fd, "hasSink"),
        hasDishwasher: form.tri(fd, "hasDishwasher"),
        cookware: form.str(fd, "cookware"),
        sheetPans: form.str(fd, "sheetPans"),
        servingPieces: form.str(fd, "servingPieces"),
        plates: form.enumOf(fd, "plates", Availability),
        flatware: form.enumOf(fd, "flatware", Availability),
        glassware: form.enumOf(fd, "glassware", Availability),
        electricalNotes: form.str(fd, "electricalNotes"),
        outdoorCooking: form.str(fd, "outdoorCooking"),
        otherNotes: form.str(fd, "otherNotes"),
      },
    });
    refresh();
    return { ok: true, message: "Kitchen details saved." };
  });
}

export async function addGuestNote(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.guestDietaryNote.create({
      data: {
        eventId: form.req(fd, "eventId"),
        guestName: form.str(fd, "guestName"),
        restriction: form.req(fd, "restriction", "Restriction"),
        severity: form.enumOf(fd, "severity", DietarySeverity) ?? "PREFERENCE",
        count: form.int(fd, "count") ?? 1,
        notes: form.str(fd, "notes"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function removeGuestNote(id: string) {
  await requireUser();
  await db.guestDietaryNote.delete({ where: { id } });
  refresh();
}
