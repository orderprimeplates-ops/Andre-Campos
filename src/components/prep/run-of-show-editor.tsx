"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { generateRunOfShow, removeRunItem, saveRunItem } from "@/app/(app)/events/actions/prep";

export interface RunItemView { id: string; time: string; title: string; kind: string; details: string | null }

const KINDS: Record<string, string> = { ARRIVAL: "Arrival", TASK: "Task", FIRE: "Fire", SERVICE: "Serve", BREAKDOWN: "Breakdown", DEPARTURE: "Depart" };
const KIND_STYLE: Record<string, string> = {
  ARRIVAL: "bg-slate-soft text-slate", TASK: "bg-sand text-ink-2", FIRE: "bg-amber-soft text-amber",
  SERVICE: "bg-wine-soft text-wine", BREAKDOWN: "bg-sand text-ink-3", DEPARTURE: "bg-sage-soft text-sage",
};

export function RunOfShowEditor({ eventId, items }: { eventId: string; items: RunItemView[] }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<RunItemView | "new" | null>(null);
  const current = editing === "new" ? null : editing;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-3">What Day-of mode shows, hour by hour. Course fire times come from the menu.</p>
        <div className="flex gap-2">
          {items.length === 0 && (
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(() => generateRunOfShow(eventId))}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Draft timeline
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" />Add</Button>
        </div>
      </div>
      {items.length > 0 && (
        <ol className="relative space-y-2 border-l border-line pl-5">
          {items.map((i) => (
            <li key={i.id} className="relative">
              <span className="absolute -left-[1.62rem] top-4 h-2.5 w-2.5 rounded-full bg-line-strong ring-4 ring-ivory" />
              <div className="group flex items-start gap-3 rounded-xl border border-line/70 bg-linen px-4 py-3">
                <div className="w-16 shrink-0 font-display text-lg leading-tight tabular">{formatTime(i.time)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.title}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide", KIND_STYLE[i.kind])}>{KINDS[i.kind]}</span>
                  </div>
                  {i.details && <ul className="mt-1 space-y-0.5 text-[0.8125rem] text-ink-2">{i.details.split("\n").filter(Boolean).map((l, n) => <li key={n}>· {l}</li>)}</ul>}
                </div>
                <button type="button" onClick={() => setEditing(i)} className="rounded-lg p-1.5 text-ink-4 hover:bg-sand hover:text-ink" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                <RemoveButton action={removeRunItem.bind(null, i.id)} label="Remove" />
              </div>
            </li>
          ))}
        </ol>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit timeline item" : "Add to timeline"}>
        {editing !== null && (
          <ActionForm action={saveRunItem} hidden={{ eventId, ...(current ? { id: current.id } : {}) }} onCancel={() => setEditing(null)} onSuccess={() => setEditing(null)}>
            <FormGrid>
              <Field label="Time" name="time"><Input id="time" name="time" type="time" required defaultValue={current?.time ?? "17:00"} /></Field>
              <Field label="Type" name="kind">
                <Select id="kind" name="kind" defaultValue={current?.kind ?? "TASK"}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
              </Field>
            </FormGrid>
            <Field label="Title" name="title"><Input id="title" name="title" required defaultValue={current?.title ?? ""} placeholder="Fire steaks" /></Field>
            <Field label="Checklist" name="details" hint="one item per line"><Textarea id="details" name="details" rows={5} defaultValue={current?.details ?? ""} placeholder={"Heat sauce\nBegin appetizer\nStart potatoes"} /></Field>
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}
