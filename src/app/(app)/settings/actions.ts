"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";

const refresh = () => revalidatePath("/", "layout");

export async function saveBusinessSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const target = form.num(fd, "targetMarginPct") ?? 45;
    const minimum = form.num(fd, "minimumMarginPct") ?? 35;
    if (minimum > target) throw new FormError("Minimum margin should be at or below your target margin.");
    if (target >= 95) throw new FormError("Target margin must be below 95%.");
    const timezone = form.str(fd, "timezone") ?? "America/New_York";
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    } catch {
      throw new FormError("That timezone isn’t recognised — use a name like America/New_York.");
    }
    const data = {
      businessName: form.str(fd, "businessName") ?? "Prime Plates",
      ownerName: form.str(fd, "ownerName") ?? "Chef",
      timezone,
      targetMarginPct: target,
      minimumMarginPct: minimum,
      targetFoodCostPct: form.num(fd, "targetFoodCostPct") ?? 28,
      mileageRateCents: form.money(fd, "mileageRate") ?? 70,
      defaultDepositPct: form.num(fd, "defaultDepositPct") ?? 50,
      finalCountLeadDays: form.int(fd, "finalCountLeadDays") ?? 7,
    };
    await db.businessSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    refresh();
    return { ok: true, message: "Saved. Margins and recommendations across the app now use these rules." };
  });
}

export async function savePlatform(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const data = {
      name: form.req(fd, "name", "Name"),
      commissionPct: form.num(fd, "commissionPct") ?? 0,
      fixedFeeCents: form.money(fd, "fixedFee") ?? 0,
      processingPct: form.num(fd, "processingPct") ?? 0,
      processingFixedCents: form.money(fd, "processingFixed") ?? 0,
      notes: form.str(fd, "notes"),
      active: fd.has("id") ? form.bool(fd, "active") : true,
    };
    if (data.commissionPct + data.processingPct >= 100) throw new FormError("Fees can’t add up to 100% or more.");
    const id = form.str(fd, "id");
    if (id) await db.platform.update({ where: { id }, data });
    else await db.platform.create({ data: { ...data, sortOrder: await db.platform.count() } });
    refresh();
    return { ok: true };
  });
}

export async function saveVendor(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const data = { name: form.req(fd, "name", "Store name"), notes: form.str(fd, "notes") };
    const id = form.str(fd, "id");
    if (id) await db.vendor.update({ where: { id }, data });
    else await db.vendor.create({ data: { ...data, sortOrder: await db.vendor.count() } });
    refresh();
    return { ok: true };
  });
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return attempt(async () => {
    const current = form.req(fd, "current", "Current password");
    const next = form.req(fd, "next", "New password");
    if (next.length < 10) throw new FormError("Use at least 10 characters — a short phrase works well.");
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await bcrypt.compare(current, row.passwordHash))) throw new FormError("Current password is incorrect.");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
    return { ok: true, message: "Password updated." };
  });
}
