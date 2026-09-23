"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { ContactMethod, LeadSource } from "@/generated/prisma/enums";

function clientData(fd: FormData) {
  return {
    name: form.req(fd, "name", "Name"),
    company: form.str(fd, "company"),
    phone: form.str(fd, "phone"),
    email: form.str(fd, "email"),
    preferredContact: form.enumOf(fd, "preferredContact", ContactMethod),
    dietaryRestrictions: form.str(fd, "dietaryRestrictions"),
    allergies: form.str(fd, "allergies"),
    likes: form.str(fd, "likes"),
    dislikes: form.str(fd, "dislikes"),
    importantNotes: form.str(fd, "importantNotes"),
    internalNotes: form.str(fd, "internalNotes"),
    referralSource: form.enumOf(fd, "referralSource", LeadSource),
    referredBy: form.str(fd, "referredBy"),
  };
}

export async function createClient(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  let id = "";
  const res = await attempt(async () => {
    id = (await db.client.create({ data: clientData(fd) })).id;
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  redirect(`/clients/${id}`);
}

export async function updateClient(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.client.update({ where: { id: form.req(fd, "id") }, data: clientData(fd) });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

/** Addresses are venues owned by the client, so the kitchen checklist carries over to events. */
export async function addClientAddress(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.venue.create({
      data: {
        clientId: form.req(fd, "clientId"),
        name: form.req(fd, "name", "Label"),
        address: form.str(fd, "address"),
        city: form.str(fd, "city"),
        state: form.str(fd, "state"),
        postalCode: form.str(fd, "postalCode"),
        parkingInstructions: form.str(fd, "parkingInstructions"),
        gateCode: form.str(fd, "gateCode"),
      },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  });
}

export async function deleteClient(id: string) {
  await requireUser();
  const events = await db.event.count({ where: { clientId: id } });
  if (events > 0) throw new FormError("This client has events and can’t be deleted.");
  await db.client.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/clients");
}
