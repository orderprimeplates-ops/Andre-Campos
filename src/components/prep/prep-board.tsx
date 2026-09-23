"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, CircleDot, Clock, GripVertical, Loader2, Pencil, Plus, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { PREP_PHASE, PREP_PHASE_ORDER, PREP_STATUS } from "@/lib/status";
import { formatDate, type ISODate } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/misc";
import { addPrepTask, generatePrep, removePrepTask, reorderPrep, setPrepStatus, updatePrepTask } from "@/app/(app)/events/actions/prep";
import type { PrepPhase, PrepStatus } from "@/generated/prisma/enums";

export interface PrepTaskView {
  id: string;
  title: string;
  phase: string;
  status: string;
  estimatedMinutes: number | null;
  assigneeId: string | null;
  assigneeName: string | null;
  recipeId: string | null;
  recipeName: string | null;
  notes: string | null;
}

const NEXT: Record<string, PrepStatus> = { NOT_STARTED: "IN_PROGRESS", IN_PROGRESS: "COMPLETE", COMPLETE: "NOT_STARTED" };

function hours(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

export function PrepBoard({
  eventId, tasks, staff, phaseDates,
}: {
  eventId: string;
  tasks: PrepTaskView[];
  staff: { id: string; name: string }[];
  phaseDates: Record<string, ISODate | null>;
}) {
  const [pending, start] = useTransition();
  const [order, setOrder] = useState(() => tasks.map((t) => t.id));
  const [synced, setSynced] = useState(tasks.map((t) => `${t.id}:${t.phase}`).join());
  const sig = tasks.map((t) => `${t.id}:${t.phase}`).join();
  if (sig !== synced) {
    setSynced(sig);
    setOrder(tasks.map((t) => t.id));
  }
  const [editing, setEditing] = useState<PrepTaskView | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const total = tasks.length;
  const complete = tasks.filter((t) => t.status === "COMPLETE").length;
  const minutesLeft = tasks.filter((t) => t.status !== "COMPLETE").reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);

  function onDragEnd(phase: string) {
    return (e: DragEndEvent) => {
      if (!e.over || e.active.id === e.over.id) return;
      const ids = order.filter((id) => byId.get(id)?.phase === phase);
      const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
      const rest = order.filter((id) => byId.get(id)?.phase !== phase);
      setOrder([...rest, ...next]);
      start(() => reorderPrep(eventId, phase as PrepPhase, next));
    };
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line/70 bg-linen p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-[2rem] leading-none tabular">{complete}<span className="text-ink-4">/{total}</span></span>
            <span className="text-sm text-ink-3">tasks done{minutesLeft ? ` · about ${hours(minutesLeft)} of work left` : ""}</span>
          </div>
          <ProgressBar value={total ? (complete / total) * 100 : 0} className="mt-3 h-2" />
          {message && <p className="mt-2 text-xs text-sage">{message}</p>}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => start(async () => {
              const r = await generatePrep(eventId);
              setMessage(r.added ? `Added ${r.added} task${r.added > 1 ? "s" : ""} from the menu.` : "Everything on the menu already has a prep task.");
            })}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {total ? "Add missing from menu" : "Generate from menu"}
          </Button>
          <ActionDialog trigger={<><Plus className="h-4 w-4" />Task</>} triggerSize="sm" triggerVariant="primary" title="Add prep task" action={addPrepTask} hidden={{ eventId }}>
            <TaskFields staff={staff} />
          </ActionDialog>
        </div>
      </div>

      <div className="space-y-6">
        {PREP_PHASE_ORDER.map((phase) => {
          const ids = order.filter((id) => byId.get(id)?.phase === phase);
          const items = ids.map((id) => byId.get(id)!);
          const mins = items.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
          const date = phaseDates[phase];
          if (!items.length) return null;
          return (
            <section key={phase}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="font-display text-[1.35rem]">{PREP_PHASE[phase]}</h3>
                <span className="text-xs text-ink-3">{date ? `${formatDate.medium(date)} · ` : ""}{items.filter((t) => t.status === "COMPLETE").length}/{items.length}{mins ? ` · ${hours(mins)}` : ""}</span>
              </div>
              <DndContext id={`prep-${phase}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd(phase)}>
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  <ul className="overflow-hidden rounded-2xl border border-line/70 bg-linen">
                    {items.map((t) => <TaskRow key={t.id} t={t} onEdit={() => setEditing(t)} />)}
                  </ul>
                </SortableContext>
              </DndContext>
            </section>
          );
        })}
        {total === 0 && (
          <p className="rounded-2xl border border-dashed border-line-strong/60 px-6 py-10 text-center text-sm text-ink-3">
            No prep plan yet. <strong className="font-medium text-ink">Generate from menu</strong> drafts one task per recipe (scaled to the guest count) plus plating tasks — then it’s yours to edit.
          </p>
        )}
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit task">
        {editing && (
          <ActionForm action={updatePrepTask} hidden={{ id: editing.id }} onCancel={() => setEditing(null)} onSuccess={() => setEditing(null)}>
            <TaskFields staff={staff} t={editing} />
            <button type="button" className="text-sm text-clay hover:underline" onClick={() => { start(() => removePrepTask(editing.id)); setEditing(null); }}>Delete task</button>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

function TaskFields({ staff, t }: { staff: { id: string; name: string }[]; t?: PrepTaskView }) {
  return (
    <>
      <Field label="Task" name="title"><Input id="title" name="title" required defaultValue={t?.title} placeholder="Pick herbs, make gremolata" /></Field>
      <FormGrid>
        <Field label="When" name="phase">
          <Select id="phase" name="phase" defaultValue={t?.phase ?? "DAY_BEFORE"}>{PREP_PHASE_ORDER.map((p) => <option key={p} value={p}>{PREP_PHASE[p]}</option>)}</Select>
        </Field>
        <Field label="Estimated minutes" name="estimatedMinutes"><Input id="estimatedMinutes" name="estimatedMinutes" type="number" min={0} step={5} defaultValue={t?.estimatedMinutes ?? ""} /></Field>
        <Field label="Assigned to" name="assigneeId">
          <Select id="assigneeId" name="assigneeId" defaultValue={t?.assigneeId ?? ""}><option value="">Me / unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        </Field>
        {t && (
          <Field label="Status" name="status">
            <Select id="status" name="status" defaultValue={t.status}>{Object.entries(PREP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
          </Field>
        )}
      </FormGrid>
      <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={t?.notes ?? ""} /></Field>
    </>
  );
}

function TaskRow({ t, onEdit }: { t: PrepTaskView; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(t.status);
  const [seen, setSeen] = useState(t.status);
  if (t.status !== seen) {
    setSeen(t.status);
    setStatus(t.status);
  }
  const done = status === "COMPLETE";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 border-b border-line/60 bg-linen px-2 py-1 last:border-0 sm:px-3", isDragging && "relative z-10 shadow-[var(--shadow-pop)]")}
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded-md p-1.5 text-ink-4 opacity-60 hover:bg-sand group-hover:opacity-100" aria-label="Reorder">
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          const next = NEXT[status];
          setStatus(next);
          start(() => setPrepStatus(t.id, next));
        }}
        aria-label={`Status: ${PREP_STATUS[status].label}. Tap to advance.`}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          done ? "border-sage bg-sage text-linen" : status === "IN_PROGRESS" ? "border-amber bg-amber-soft text-amber" : "border-line-strong bg-white",
          pending && "opacity-60",
        )}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : status === "IN_PROGRESS" ? <CircleDot className="h-3.5 w-3.5" /> : null}
      </button>
      <div className="min-w-0 flex-1 py-2">
        <div className={cn("text-[0.9375rem]", done ? "text-ink-4 line-through decoration-ink-4/40" : "text-ink")}>{t.title}</div>
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
          {t.estimatedMinutes ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{hours(t.estimatedMinutes)}</span> : null}
          {t.assigneeName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{t.assigneeName}</span>}
          {t.recipeId && <Link href={`/recipes/${t.recipeId}`} className="hover:text-wine">Recipe →</Link>}
          {status === "IN_PROGRESS" && <span className="text-amber">In progress</span>}
        </div>
        {t.notes && <div className="text-xs italic text-ink-2">{t.notes}</div>}
      </div>
      <button type="button" onClick={onEdit} className="rounded-lg p-2 text-ink-4 hover:bg-sand hover:text-ink sm:opacity-0 sm:group-hover:opacity-100" aria-label="Edit task">
        <Pencil className="h-4 w-4" />
      </button>
    </li>
  );
}
