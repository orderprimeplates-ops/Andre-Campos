"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, FormError, type ActionState } from "@/lib/server/forms";
import { Course, MenuStatus } from "@/generated/prisma/enums";
import { COURSE_TEMPLATES } from "@/lib/menu-templates";

const refresh = () => revalidatePath("/", "layout");

async function menuFor(eventId: string) {
  return (
    (await db.menu.findUnique({ where: { eventId } })) ?? (await db.menu.create({ data: { eventId, status: "DRAFT" } }))
  );
}


export async function applyCourseTemplate(eventId: string, template: string) {
  await requireUser();
  const names = COURSE_TEMPLATES[template];
  if (!names) return;
  const menu = await menuFor(eventId);
  const existing = await db.menuCourse.count({ where: { menuId: menu.id } });
  await db.menuCourse.createMany({ data: names.map((name, i) => ({ menuId: menu.id, name, sortOrder: existing + i })) });
  refresh();
}

export async function addCourse(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const menu = await menuFor(form.req(fd, "eventId"));
    const last = await db.menuCourse.findFirst({ where: { menuId: menu.id }, orderBy: { sortOrder: "desc" } });
    await db.menuCourse.create({
      data: { menuId: menu.id, name: form.req(fd, "name", "Course name"), fireTime: form.time(fd, "fireTime"), sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    refresh();
    return { ok: true };
  });
}

export async function updateCourse(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.menuCourse.update({
      where: { id: form.req(fd, "courseId") },
      data: { name: form.req(fd, "name", "Course name"), fireTime: form.time(fd, "fireTime") },
    });
    refresh();
    return { ok: true };
  });
}

export async function deleteCourse(courseId: string) {
  await requireUser();
  await db.menuCourse.delete({ where: { id: courseId } });
  refresh();
}

/** Persist a new course order (used by drag-and-drop). */
export async function reorderCourses(menuId: string, orderedIds: string[]) {
  await requireUser();
  await db.$transaction(orderedIds.map((id, i) => db.menuCourse.update({ where: { id, menuId }, data: { sortOrder: i } })));
  refresh();
}

export async function addDishToCourse(courseId: string, dishId: string) {
  await requireUser();
  const last = await db.menuItem.findFirst({ where: { courseId }, orderBy: { sortOrder: "desc" } });
  await db.menuItem.create({ data: { courseId, dishId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  refresh();
}

/** A one-off dish for this menu, optionally built from existing recipes and saved to the library. */
export async function createCustomDish(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const courseId = form.req(fd, "courseId");
    const recipeIds = form.list(fd, "recipeIds");
    const dish = await db.dish.create({
      data: {
        name: form.req(fd, "name", "Dish name"),
        description: form.str(fd, "description"),
        course: form.enumOf(fd, "course", Course) ?? "ENTREE",
        inLibrary: form.bool(fd, "saveToLibrary"),
        components: { create: recipeIds.map((recipeId, i) => ({ recipeId, sortOrder: i, portionsPerServing: 1 })) },
      },
    });
    const last = await db.menuItem.findFirst({ where: { courseId }, orderBy: { sortOrder: "desc" } });
    await db.menuItem.create({ data: { courseId, dishId: dish.id, sortOrder: (last?.sortOrder ?? -1) + 1 } });
    refresh();
    return { ok: true };
  });
}

export async function updateMenuItem(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const portions = form.num(fd, "portionsPerGuest");
    if (portions !== null && portions <= 0) throw new FormError("Portions per guest must be more than zero.");
    await db.menuItem.update({
      where: { id: form.req(fd, "itemId") },
      data: { guestCount: form.int(fd, "guestCount"), portionsPerGuest: portions ?? 1, notes: form.str(fd, "notes") },
    });
    refresh();
    return { ok: true };
  });
}

export async function removeMenuItem(itemId: string) {
  await requireUser();
  await db.menuItem.delete({ where: { id: itemId } });
  refresh();
}

export async function moveMenuItem(itemId: string, direction: -1 | 1) {
  await requireUser();
  const item = await db.menuItem.findUniqueOrThrow({ where: { id: itemId } });
  const siblings = await db.menuItem.findMany({ where: { courseId: item.courseId }, orderBy: { sortOrder: "asc" } });
  const idx = siblings.findIndex((s) => s.id === itemId);
  const swap = siblings[idx + direction];
  if (!swap) return;
  const order = siblings.map((s) => s.id);
  [order[idx], order[idx + direction]] = [order[idx + direction], order[idx]];
  await db.$transaction(order.map((id, i) => db.menuItem.update({ where: { id }, data: { sortOrder: i } })));
  refresh();
}

export async function setMenuStatus(eventId: string, status: MenuStatus) {
  await requireUser();
  const menu = await menuFor(eventId);
  await db.menu.update({
    where: { id: menu.id },
    data: {
      status,
      sentAt: status === "SENT" && !menu.sentAt ? new Date() : menu.sentAt,
      approvedAt: status === "APPROVED" ? new Date() : status === "DRAFT" ? null : menu.approvedAt,
    },
  });
  refresh();
}

export async function updateMenuMeta(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const menu = await menuFor(form.req(fd, "eventId"));
    await db.menu.update({ where: { id: menu.id }, data: { title: form.str(fd, "title"), clientNotes: form.str(fd, "clientNotes") } });
    refresh();
    return { ok: true };
  });
}
