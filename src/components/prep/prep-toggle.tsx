"use client";

import { useState, useTransition } from "react";
import { Check, CircleDot } from "lucide-react";
import { cn } from "@/lib/cn";
import { setPrepStatus } from "@/app/(app)/events/actions/prep";
import type { PrepStatus } from "@/generated/prisma/enums";

const NEXT: Record<string, PrepStatus> = { NOT_STARTED: "IN_PROGRESS", IN_PROGRESS: "COMPLETE", COMPLETE: "NOT_STARTED" };

/** Tap to cycle: not started → in progress → complete. */
export function PrepToggle({ id, status, title, meta }: { id: string; status: string; title: string; meta: string }) {
  const [s, setS] = useState(status);
  const [, start] = useTransition();
  const done = s === "COMPLETE";
  return (
    <button
      type="button"
      onClick={() => {
        const n = NEXT[s];
        setS(n);
        start(() => setPrepStatus(id, n));
      }}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sand/40"
    >
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2", done ? "border-sage bg-sage text-linen" : s === "IN_PROGRESS" ? "border-amber bg-amber-soft text-amber" : "border-line-strong bg-white")}>
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s === "IN_PROGRESS" ? <CircleDot className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[0.9375rem]", done ? "text-ink-4 line-through" : "text-ink")}>{title}</span>
        <span className="block truncate text-xs text-ink-3">{meta}</span>
      </span>
    </button>
  );
}
