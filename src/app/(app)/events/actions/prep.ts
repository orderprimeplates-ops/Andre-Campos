"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { attempt, form, type ActionState } from "@/lib/server/forms";
import { PrepPhase, PrepStatus, RunOfShowKind } from "@/generated/prisma/enums";
import { menuInclude, toMenuInput, toRecipeInput } from "@/lib/mappers";
import { menuRequirements } from "@/lib/domain/culinary";
import { draftPrepTasks, draftRunOfShow } from "@/lib/domain/planning";

const refresh = () => revalidatePath("/", "layout");

/** Drafts prep tasks from the menu. Only adds what's missing, never overwrites your edits. */
export async function generatePrep(eventId: string): Promise<{ added: number }> {
  await requireUser();
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { menu: { include: menuInclude }, prepTasks: true } });
  if (!event.menu) return { added: 0 };
  const recipeRows = new Map(event.menu.courses.flatMap((c) => c.items).flatMap((i) => i.dish.components).map((c) => [c.recipe.id, c.recipe]));
  const reqs = menuRequirements(toMenuInput(event.menu), event.guestCount).map((r) => ({ ...r, recipe: toRecipeInput(recipeRows.get(r.recipe.id)!) }));
  const dishes = [...new Map(event.menu.courses.flatMap((c) => c.items.map((i) => [i.dish.id, { id: i.dish.id, name: i.dish.name }]))).values()];
  const drafts = draftPrepTasks(reqs, dishes, event.prepTasks);
  const base = event.prepTasks.length;
  await db.prepTask.createMany({ data: drafts.map((d, i) => ({ eventId, ...d, generated: true, sortOrder: base + i })) });
  refresh();
  return { added: drafts.length };
}

export async function addPrepTask(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const eventId = form.req(fd, "eventId");
    const count = await db.prepTask.count({ where: { eventId } });
    await db.prepTask.create({
      data: {
        eventId,
        title: form.req(fd, "title", "Task"),
        phase: form.enumOf(fd, "phase", PrepPhase) ?? "DAY_BEFORE",
        estimatedMinutes: form.int(fd, "estimatedMinutes"),
        assigneeId: form.str(fd, "assigneeId"),
        recipeId: form.str(fd, "recipeId"),
        notes: form.str(fd, "notes"),
        sortOrder: count,
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function updatePrepTask(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    await db.prepTask.update({
      where: { id: form.req(fd, "id") },
      data: {
        title: form.req(fd, "title", "Task"),
        phase: form.enumOf(fd, "phase", PrepPhase) ?? undefined,
        estimatedMinutes: form.int(fd, "estimatedMinutes"),
        assigneeId: form.str(fd, "assigneeId"),
        status: form.enumOf(fd, "status", PrepStatus) ?? undefined,
        notes: form.str(fd, "notes"),
      },
    });
    refresh();
    return { ok: true };
  });
}

export async function setPrepStatus(id: string, status: PrepStatus) {
  await requireUser();
  await db.prepTask.update({ where: { id }, data: { status } });
  refresh();
}

export async function removePrepTask(id: string) {
  await requireUser();
  await db.prepTask.delete({ where: { id } });
  refresh();
}

/** Save a new order within a phase (drag and drop). */
export async function reorderPrep(eventId: string, phase: PrepPhase, orderedIds: string[]) {
  await requireUser();
  await db.$transaction(orderedIds.map((id, i) => db.prepTask.update({ where: { id, eventId }, data: { sortOrder: i, phase } })));
  refresh();
}

// ─── Day-of timeline (run of show) ─────────────────────────────────────────

export async function generateRunOfShow(eventId: string) {
  await requireUser();
  const event = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { menu: { include: menuInclude }, runOfShow: true } });
  if (event.runOfShow.length) return;
  const draft = draftRunOfShow({
    arrivalTime: event.arrivalTime, serviceTime: event.serviceTime, endTime: event.endTime,
    courses: (event.menu?.courses ?? []).map((c) => ({ name: c.name, fireTime: c.fireTime, dishes: c.items.map((i) => i.dish.name) })),
  });
  await db.runOfShowItem.createMany({ data: draft.map((d, i) => ({ eventId, ...d, sortOrder: i, doneLines: [] })) });
  refresh();
}

export async function saveRunItem(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser();
  return attempt(async () => {
    const id = form.str(fd, "id");
    const data = {
      time: form.time(fd, "time") ?? "12:00",
      title: form.req(fd, "title", "Title"),
      kind: form.enumOf(fd, "kind", RunOfShowKind) ?? "TASK",
      details: form.str(fd, "details"),
    };
    if (id) await db.runOfShowItem.update({ where: { id }, data: { ...data, doneLines: [] } });
    else await db.runOfShowItem.create({ data: { ...data, eventId: form.req(fd, "eventId"), doneLines: [] } });
    refresh();
    return { ok: true };
  });
}

export async function removeRunItem(id: string) {
  await requireUser();
  await db.runOfShowItem.delete({ where: { id } });
  refresh();
}

/** Day-of mode: tick a checklist line, or the whole block. */
export async function toggleRunLine(id: string, line: number | null) {
  await requireUser();
  const item = await db.runOfShowItem.findUniqueOrThrow({ where: { id } });
  if (line === null) {
    const lines = (item.details ?? "").split("\n").filter(Boolean).length;
    const done = !item.done;
    await db.runOfShowItem.update({ where: { id }, data: { done, doneLines: done ? Array.from({ length: lines }, (_, i) => i) : [] } });
  } else {
    const set = new Set(item.doneLines);
    if (set.has(line)) set.delete(line);
    else set.add(line);
    const total = (item.details ?? "").split("\n").filter(Boolean).length;
    await db.runOfShowItem.update({ where: { id }, data: { doneLines: [...set], done: total > 0 && set.size >= total } });
  }
  refresh();
}
