"use client";

import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { STAFF_STATUS, TONE_CLASSES } from "@/lib/status";
import { setAssignmentStatus } from "@/app/(app)/events/actions/staff";
import type { AssignmentStatus } from "@/generated/prisma/enums";

export function AssignmentStatusSelect({ id, status, filled }: { id: string; status: string; filled: boolean }) {
  const [pending, start] = useTransition();
  const tone = STAFF_STATUS[status]?.tone ?? "neutral";
  return (
    <select
      aria-label="Staff status"
      value={status}
      disabled={pending}
      onChange={(e) => start(() => setAssignmentStatus(id, e.target.value as AssignmentStatus))}
      className={cn("h-8 cursor-pointer appearance-none rounded-full px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-wine/20", TONE_CLASSES[tone].pill, pending && "opacity-60")}
    >
      {Object.entries(STAFF_STATUS)
        .filter(([k]) => filled || k === "NEEDED")
        .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>
  );
}
