"use client";

import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Small icon button that runs a server action (bound with its id). */
export function RemoveButton({ action, label, className }: { action: () => Promise<void>; label: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => start(() => action())}
      className={cn("rounded-lg p-1.5 text-ink-4 transition-colors hover:bg-clay-soft hover:text-clay disabled:opacity-50", className)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
    </button>
  );
}
