"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logContact, setLeadStatus } from "@/app/(app)/leads/actions";
import { LEAD_PIPELINE, LEAD_STATUS } from "@/lib/status";
import { cn } from "@/lib/cn";

export function LogContactButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const run = (days: number | null) => start(() => logContact(id, days));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Reached out — follow up in
      </span>
      {[
        ["2 days", 2],
        ["1 week", 7],
        ["2 weeks", 14],
      ].map(([label, days]) => (
        <Button key={label} size="sm" variant="quiet" disabled={pending} onClick={() => run(days as number)}>{label}</Button>
      ))}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(null)}>No follow-up</Button>
    </div>
  );
}

/** Stage stepper. Booked routes to conversion, Lost asks why. */
export function StageStepper({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const stages = LEAD_PIPELINE.filter((s) => s !== "LOST");
  const idx = stages.indexOf(status as (typeof stages)[number]);
  return (
    <div className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1">
      {stages.map((s, i) => {
        const done = idx >= 0 && i <= idx;
        return (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            onClick={() => (s === "BOOKED" ? router.push(`/leads/${id}/convert`) : start(() => setLeadStatus(id, s)))}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              s === status ? "border-espresso bg-espresso text-linen" : done ? "border-line bg-sand text-ink-2 hover:border-line-strong" : "border-line bg-linen text-ink-3 hover:border-line-strong hover:text-ink",
            )}
          >
            {done && s !== status && <Check className="h-3 w-3" />}
            {LEAD_STATUS[s].label}
          </button>
        );
      })}
    </div>
  );
}
