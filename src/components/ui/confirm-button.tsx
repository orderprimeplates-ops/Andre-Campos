"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./button";

/** Two-step destructive button: click, then confirm. */
export function ConfirmButton({
  action,
  label,
  confirmLabel = "Confirm",
  icon,
  size = "sm",
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed)
    return (
      <Button variant="danger" size={size} onClick={() => setArmed(true)}>
        {icon}
        {label}
      </Button>
    );
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size={size} onClick={() => setArmed(false)} disabled={pending}>Cancel</Button>
      <Button
        size={size}
        className="bg-clay text-linen hover:bg-clay/90"
        disabled={pending}
        onClick={() => start(() => action())}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {confirmLabel}
      </Button>
    </div>
  );
}
