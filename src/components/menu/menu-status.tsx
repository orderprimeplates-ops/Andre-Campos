"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { setMenuStatus } from "@/app/(app)/events/actions/menu";
import type { MenuStatus } from "@/generated/prisma/enums";

const STEPS: { key: MenuStatus; label: string; hint: string }[] = [
  { key: "DRAFT", label: "Draft", hint: "Working on it" },
  { key: "SENT", label: "Sent", hint: "Awaiting client approval" },
  { key: "APPROVED", label: "Approved", hint: "Locked in with the client" },
];

export function MenuStatusControl({ eventId, status }: { eventId: string; status: string }) {
  const [pending, start] = useTransition();
  const idx = STEPS.findIndex((s) => s.key === status);
  return (
    <div>
      <div className="eyebrow mb-2">Menu status</div>
      <div className={cn("grid grid-cols-3 gap-1 rounded-xl bg-sand/70 p-1", pending && "opacity-60")}>
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            disabled={pending}
            onClick={() => start(() => setMenuStatus(eventId, s.key))}
            className={cn(
              "flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.8125rem] font-medium transition-all",
              s.key === status ? (s.key === "APPROVED" ? "bg-sage text-linen shadow-sm" : "bg-linen text-ink shadow-sm") : "text-ink-3 hover:text-ink",
            )}
          >
            {i < idx && <Check className="h-3.5 w-3.5" />}
            {s.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-3">{STEPS[Math.max(0, idx)].hint}</p>
    </div>
  );
}
