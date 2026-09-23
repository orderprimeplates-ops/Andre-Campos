"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./button";

/** A button that runs a bound server action with a pending state. */
export function ToggleActionButton({ action, label, icon, variant = "secondary" }: { action: () => Promise<void>; label: string; icon?: React.ReactNode; variant?: "secondary" | "ghost" | "quiet" }) {
  const [pending, start] = useTransition();
  return (
    <Button variant={variant} disabled={pending} onClick={() => start(() => action())}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </Button>
  );
}
