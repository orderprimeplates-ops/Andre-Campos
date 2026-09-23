"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getToday } from "@/lib/server/settings";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { AssignmentStatus, RateType, StaffRole } from "@/generated/prisma/enums";
import { fromISODate } from "@/lib/domain/dates";

const refresh = () => revalidatePath("/", "layout");

async function assignmentData(fd: FormData) {
  const staffMemberId = form.str(fd, "staffMemberId");
  const member = staffMemberId ? await db.staffMember.findUnique({ where: { id: staffMemberId } }) : null;
  const rate = form.money(fd, "rate");
  return {
    staffMemberId,
    role: form.enumOf(fd, "role", StaffRole) ?? member?.role ?? "OTHER",
    rateCents: rate ?? member?.rateCents ?? 0,
    rateType: form.enumOf(fd, "rateType", RateType) ?? member?.rateType ?? "HOURLY",
    callTime: form.time(fd, "callTime"),
    endTime: form.time(fd, "endTime"),
    status: form.enumOf(fd, "status", AssignmentStatus) ?? (staffMemberId ? "INVITED" : "NEEDED"),
    responsibilities: form.str(fd, "responsibilities"),
  };
}

export async function addAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const count = await db.staffAssignment.count({ where: { eventId } });
    await db.staffAssignment.create({ data: { eventId, sortOrder: count, ...(await assignmentData(fd)) } });
    refresh();
    return { ok: true };
  });
}

export async function updateAssignment(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const data = await assignmentData(fd);
    const actualPay = form.money(fd, "actualPay");
    await db.staffAssignment.update({ where: { id: form.req(fd, "id") }, data: { ...data, actualPayCents: actualPay } });
    refresh();
    return { ok: true };
  });
}

export async function setAssignmentStatus(id: string, status: AssignmentStatus) {
  await requireUser();
  const { today } = await getToday();
  await db.staffAssignment.update({ where: { id }, data: { status, paidOn: status === "PAID" ? fromISODate(today) : null } });
  refresh();
}

export async function removeAssignment(id: string) {
  await requireUser();
  await db.staffAssignment.delete({ where: { id } });
  refresh();
}
