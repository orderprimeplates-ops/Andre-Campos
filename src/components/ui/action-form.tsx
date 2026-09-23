"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";
import { FormError } from "./field";
import { SubmitButton } from "./submit-button";
import { Button, buttonClass } from "./button";

type State = { ok?: boolean; error?: string; message?: string; id?: string } | undefined;
type Action = (state: State, fd: FormData) => Promise<State>;

/**
 * A button that opens a dialog containing a server-action form.
 * Closes itself when the action succeeds.
 */
export function ActionDialog({
  trigger,
  triggerVariant = "secondary",
  triggerSize = "md",
  triggerClassName,
  triggerLabel,
  title,
  description,
  action,
  submitLabel = "Save",
  children,
  wide,
  hidden,
}: {
  /** Content of the trigger button (text and/or icon). */
  trigger: React.ReactNode;
  triggerVariant?: Parameters<typeof buttonClass>[0];
  triggerSize?: Parameters<typeof buttonClass>[1];
  /** Overrides the button styling entirely (e.g. for a clickable row). */
  triggerClassName?: string;
  triggerLabel?: string;
  title: string;
  description?: string;
  action: Action;
  submitLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
  hidden?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        title={triggerLabel}
        className={triggerClassName ?? buttonClass(triggerVariant, triggerSize)}
        onClick={() => {
          setFormKey((k) => k + 1);
          setOpen(true);
        }}
      >
        {trigger}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description} wide={wide}>
        <ActionForm key={formKey} action={action} submitLabel={submitLabel} onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} hidden={hidden}>
          {children}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function ActionForm({
  action,
  submitLabel = "Save",
  onSuccess,
  onCancel,
  children,
  hidden,
  className,
  resetOnSuccess,
}: {
  action: Action;
  submitLabel?: string;
  onSuccess?: (s: State) => void;
  onCancel?: () => void;
  children: React.ReactNode;
  hidden?: Record<string, string>;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const handled = useRef<State>(undefined);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    }
  }, [state, onSuccess, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className ?? "space-y-4"}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <FormError message={state?.error} />
      {state?.ok && state.message && <p className="rounded-xl bg-sage-soft px-3.5 py-2.5 text-sm text-sage">{state.message}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
