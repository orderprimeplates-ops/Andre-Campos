"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonClass } from "./button";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  pendingLabel,
  pending: pendingProp,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Parameters<typeof buttonClass>[0];
  size?: Parameters<typeof buttonClass>[1];
  pendingLabel?: string;
  /** Pass when the form is submitted via onSubmit (useFormAction) rather than `action`. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={buttonClass(variant, size, className)} {...rest}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
