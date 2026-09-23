"use client";

import { useState } from "react";
import { Field, FormGrid, Input } from "@/components/ui/field";

/** Pick an existing client, or type a new one without leaving the form. */
export function ClientChooser({ clients, defaultId }: { clients: { id: string; name: string }[]; defaultId?: string }) {
  const [value, setValue] = useState(defaultId ?? (clients.length ? "" : "new"));
  return (
    <div className="space-y-4">
      <Field label="Client" name="clientId">
        <select
          id="clientId"
          name="clientId"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="h-11 w-full rounded-xl border border-line-strong/60 bg-white/70 px-3.5 text-[0.9375rem] focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10"
        >
          <option value="" disabled>Choose a client…</option>
          <option value="new">+ New client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      {value === "new" && (
        <FormGrid className="rounded-2xl bg-sand/50 p-4 sm:grid-cols-3">
          <Field label="Client name" name="newClientName"><Input id="newClientName" name="newClientName" required /></Field>
          <Field label="Phone" name="newClientPhone"><Input id="newClientPhone" name="newClientPhone" type="tel" /></Field>
          <Field label="Email" name="newClientEmail"><Input id="newClientEmail" name="newClientEmail" type="email" /></Field>
        </FormGrid>
      )}
    </div>
  );
}
