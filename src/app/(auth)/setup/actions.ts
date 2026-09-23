"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { createSession } from "@/lib/server/auth";
import { DEFAULT_PLATFORMS, DEFAULT_VENDORS } from "@/lib/starter-data";

const schema = z
  .object({
    name: z.string().trim().min(1, "Tell us your name."),
    businessName: z.string().trim().min(1, "Enter your business name."),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: z.string().min(10, "Use at least 10 characters — a short phrase works well."),
    confirm: z.string(),
    timezone: z.string().refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Choose your timezone."),
  })
  .refine((d) => d.password === d.confirm, { message: "The two passwords don’t match.", path: ["confirm"] });

/**
 * First-run setup: creates the owner account on a brand-new database, plus starter stores and
 * booking platforms. Refuses to run once any account exists, so it can't be used to add logins later.
 */
export async function createOwner(_: { error?: string } | undefined, fd: FormData): Promise<{ error?: string } | undefined> {
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;
  const passwordHash = await bcrypt.hash(d.password, 12);

  let userId: string | null = null;
  try {
    userId = await db.$transaction(
      async (tx) => {
        if ((await tx.user.count()) > 0) return null;
        const user = await tx.user.create({ data: { email: d.email, name: d.name, role: "OWNER", passwordHash } });
        const settings = { ownerName: d.name.split(/\s+/)[0], businessName: d.businessName, timezone: d.timezone };
        await tx.businessSettings.upsert({ where: { id: 1 }, create: { id: 1, ...settings }, update: settings });
        if ((await tx.vendor.count()) === 0) {
          await tx.vendor.createMany({ data: DEFAULT_VENDORS.map((name, i) => ({ name, sortOrder: i })) });
        }
        if ((await tx.platform.count()) === 0) {
          await tx.platform.createMany({ data: DEFAULT_PLATFORMS.map((p, i) => ({ ...p, sortOrder: i })) });
        }
        return user.id;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (e) {
    console.error(e);
    return { error: "Setup couldn’t finish. Please try again." };
  }
  if (!userId) redirect("/login");
  await createSession(userId);
  redirect("/");
}
