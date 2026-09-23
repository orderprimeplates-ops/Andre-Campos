"use client";

import { useFormAction } from "@/components/ui/use-form-action";
import { createOwner } from "./actions";
import { Field, FormError, FormGrid, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { US_TIMEZONES } from "@/lib/starter-data";

export function SetupForm() {
  const { state, pending, onSubmit } = useFormAction(createOwner);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormGrid>
        <Field label="Your name" name="name"><Input id="name" name="name" autoComplete="name" required autoFocus /></Field>
        <Field label="Business name" name="businessName"><Input id="businessName" name="businessName" defaultValue="Prime Plates" required /></Field>
      </FormGrid>
      <Field label="Email" name="email" hint="you’ll sign in with this"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
      <FormGrid>
        <Field label="Password" name="password" hint="10+ characters"><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
        <Field label="Confirm password" name="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required /></Field>
      </FormGrid>
      <Field label="Your timezone" name="timezone" hint="for “today”, deadlines and Day-of mode">
        <Select id="timezone" name="timezone" defaultValue="America/New_York">
          {US_TIMEZONES.map(([tz, label]) => <option key={tz} value={tz}>{label}</option>)}
        </Select>
      </Field>
      <FormError message={state?.error} />
      <SubmitButton pending={pending} className="w-full" size="lg" pendingLabel="Setting up…">Create my account</SubmitButton>
    </form>
  );
}
