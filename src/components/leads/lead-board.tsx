"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarDays, Clock, GripVertical, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { LEAD_PIPELINE, LEAD_SOURCE, LEAD_STATUS, LOST_REASON, EVENT_TYPE, TONE_CLASSES } from "@/lib/status";
import { formatDate, daysBetween, type ISODate } from "@/lib/domain/dates";
import { formatMoney, formatMoneyCompact } from "@/lib/domain/money";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Select, Textarea } from "@/components/ui/field";
import { markLost, setLeadStatus } from "@/app/(app)/leads/actions";

export interface BoardLead {
  id: string;
  name: string;
  status: string;
  eventDate: ISODate | null;
  eventType: string | null;
  guestCount: number | null;
  estimatedValueCents: number | null;
  source: string;
  nextFollowUpDate: ISODate | null;
  lostReason: string | null;
  boardOrder: number;
}

type Status = (typeof LEAD_PIPELINE)[number];

export function LeadBoard({ leads, today }: { leads: BoardLead[]; today: ISODate }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, move] = useOptimistic(leads, (state, { id, status }: { id: string; status: string }) =>
    state.map((l) => (l.id === id ? { ...l, status, boardOrder: -Infinity } : l)),
  );
  const [dragging, setDragging] = useState<BoardLead | null>(null);
  const [losing, setLosing] = useState<BoardLead | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  function onDragStart(e: DragStartEvent) {
    setDragging(optimistic.find((l) => l.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const lead = optimistic.find((l) => l.id === e.active.id);
    const to = e.over?.id as Status | undefined;
    if (!lead || !to || to === lead.status) return;
    if (to === "LOST") return setLosing(lead);
    if (to === "BOOKED") return router.push(`/leads/${lead.id}/convert`);
    const minOrder = Math.min(0, ...optimistic.filter((l) => l.status === to).map((l) => l.boardOrder)) - 1;
    startTransition(async () => {
      move({ id: lead.id, status: to });
      await setLeadStatus(lead.id, to, minOrder);
    });
  }

  return (
    <>
      <DndContext id="lead-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:snap-none">
          {LEAD_PIPELINE.map((status) => {
            const items = optimistic.filter((l) => l.status === status).sort((a, b) => a.boardOrder - b.boardOrder);
            return <Column key={status} status={status} items={items} today={today} />;
          })}
        </div>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
          {dragging && <LeadCard lead={dragging} today={today} overlay />}
        </DragOverlay>
      </DndContext>

      <Dialog open={!!losing} onClose={() => setLosing(null)} title="Mark as lost" description={losing ? `Why didn’t ${losing.name} book?` : undefined}>
        {losing && (
          <ActionForm action={markLost} hidden={{ id: losing.id }} submitLabel="Mark lost" onCancel={() => setLosing(null)} onSuccess={() => setLosing(null)}>
            <Field label="Reason" name="lostReason">
              <Select id="lostReason" name="lostReason" defaultValue="PRICE">
                {Object.entries(LOST_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Notes" name="lostNotes" hint="optional">
              <Textarea id="lostNotes" name="lostNotes" rows={2} placeholder="What would have changed their mind?" />
            </Field>
          </ActionForm>
        )}
      </Dialog>
    </>
  );
}

function Column({ status, items, today }: { status: Status; items: BoardLead[]; today: ISODate }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = LEAD_STATUS[status];
  const total = items.reduce((s, l) => s + (l.estimatedValueCents ?? 0), 0);
  const quiet = status === "LOST";
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[82vw] shrink-0 snap-start flex-col rounded-[1.25rem] border p-2.5 transition-all duration-200 sm:w-[15rem] 2xl:w-auto 2xl:min-w-[14rem] 2xl:flex-1",
        isOver ? "border-wine/30 bg-wine-soft/50 shadow-[inset_0_0_0_1px_rgb(122_46_58/0.12)]" : "border-line/70 bg-sand/45",
        quiet && !isOver && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-2.5 pt-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", TONE_CLASSES[meta.tone].dot)} />
          <span className="text-[0.8125rem] font-semibold text-ink">{meta.label}</span>
          <span className="text-xs text-ink-3 tabular">{items.length}</span>
        </div>
        {total > 0 && <span className="text-xs text-ink-3 tabular">{formatMoneyCompact(total)}</span>}
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {items.map((l) => <DraggableCard key={l.id} lead={l} today={today} />)}
        {items.length === 0 && <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line-strong/50 py-6 text-xs text-ink-4">Drop here</div>}
      </div>
    </div>
  );
}

function DraggableCard({ lead, today }: { lead: BoardLead; today: ISODate }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn("touch-manipulation", isDragging && "opacity-30")}>
      <LeadCard lead={lead} today={today} />
    </div>
  );
}

function LeadCard({ lead, today, overlay }: { lead: BoardLead; today: ISODate; overlay?: boolean }) {
  const followDays = lead.nextFollowUpDate ? daysBetween(today, lead.nextFollowUpDate) : null;
  const followTone = followDays === null ? null : followDays < 0 ? "clay" : followDays === 0 ? "amber" : "neutral";
  return (
    <Link
      href={`/leads/${lead.id}`}
      draggable={false}
      className={cn(
        "group block rounded-xl border border-line/80 bg-linen p-3 shadow-[0_1px_2px_rgb(58_44_38/0.05)] transition-all duration-200 hover:border-line-strong hover:shadow-[var(--shadow-card)]",
        overlay && "rotate-[1.5deg] cursor-grabbing shadow-[var(--shadow-pop)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[0.9375rem] font-medium text-ink">{lead.name}</div>
          <div className="truncate text-xs text-ink-3">
            {lead.eventType ? EVENT_TYPE[lead.eventType]?.label : "Inquiry"} · {LEAD_SOURCE[lead.source]}
          </div>
        </div>
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
        {lead.eventDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3 text-ink-4" />{formatDate.short(lead.eventDate)}</span>}
        {lead.guestCount && <span className="flex items-center gap-1"><Users className="h-3 w-3 text-ink-4" />{lead.guestCount}</span>}
        {lead.estimatedValueCents ? <span className="ml-auto font-medium tabular text-ink">{formatMoney(lead.estimatedValueCents)}</span> : null}
      </div>
      {lead.status === "LOST" && lead.lostReason && <div className="mt-2 text-xs text-ink-3">Lost · {LOST_REASON[lead.lostReason]}</div>}
      {followTone && lead.status !== "LOST" && lead.status !== "BOOKED" && (
        <div className={cn("mt-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium", TONE_CLASSES[followTone].pill)}>
          <Clock className="h-3 w-3" />
          {followDays! < 0 ? `Follow-up ${-followDays!}d overdue` : followDays === 0 ? "Follow up today" : `Follow up ${formatDate.short(lead.nextFollowUpDate!)}`}
        </div>
      )}
    </Link>
  );
}
