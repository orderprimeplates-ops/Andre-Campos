"use client";

import { useFormAction } from "@/components/ui/use-form-action";
import { login } from "./actions";
import { Field, FormError, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useFormAction(login);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email">
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" name="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
