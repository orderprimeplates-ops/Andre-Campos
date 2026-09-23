import { Plus, TriangleAlert, Users } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { DIETARY_SEVERITY, metaOf } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { setGuestCount, updateEventNotes } from "@/app/(app)/events/actions/core";
import { addGuestNote, removeGuestNote } from "@/app/(app)/events/actions/venue";
import { formatDate, toISODate } from "@/lib/domain/dates";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export function GuestsTab({ ws }: { ws: WS }) {
  const { event: e } = ws;
  const sorted = [...e.guestNotes].sort((a, b) => ["SEVERE_ALLERGY", "ALLERGY", "INTOLERANCE", "PREFERENCE"].indexOf(a.severity) - ["SEVERE_ALLERGY", "ALLERGY", "INTOLERANCE", "PREFERENCE"].indexOf(b.severity));
  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Guest count" />
          <CardBody>
            <ActionForm action={setGuestCount} hidden={{ id: e.id }} submitLabel="Update count">
              <div className="flex items-end gap-3">
                <Users className="mb-3 h-6 w-6 text-ink-4" />
                <Input name="guestCount" type="number" min={1} defaultValue={e.guestCount} className="h-16 w-32 text-center font-display text-4xl" aria-label="Guest count" />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-ink-2">
                <input type="checkbox" name="guestCountConfirmed" defaultChecked={e.guestCountConfirmed} className="h-4 w-4 accent-[var(--color-wine)]" />
                Final count confirmed by client
              </label>
              {e.finalCountDueDate && !e.guestCountConfirmed && (
                <p className="text-xs text-ink-3">Final count due {formatDate.medium(toISODate(e.finalCountDueDate))}</p>
              )}
              <p className="text-xs text-ink-4">Changing the count rescales recipes, the shopping list, prep and projected food cost.</p>
            </ActionForm>
          </CardBody>
        </Card>
        {(e.client.allergies || e.client.dietaryRestrictions || e.client.dislikes) && (
          <Card className="bg-sand/40">
            <CardBody className="space-y-2 pt-5 text-sm">
              <div className="eyebrow">From {e.client.name}’s profile</div>
              {e.client.allergies && <p><span className="font-medium text-clay">Allergies:</span> {e.client.allergies}</p>}
              {e.client.dietaryRestrictions && <p><span className="font-medium">Dietary:</span> {e.client.dietaryRestrictions}</p>}
              {e.client.dislikes && <p><span className="font-medium">Dislikes:</span> {e.client.dislikes}</p>}
            </CardBody>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader
            title="Dietary needs"
            description="Allergies here are checked against every dish on the menu."
            action={
              <ActionDialog trigger={<><Plus className="h-4 w-4" />Add</>} triggerSize="sm" title="Add a dietary need" action={addGuestNote} hidden={{ eventId: e.id }}>
                <FormGrid>
                  <Field label="Restriction" name="restriction"><Input id="restriction" name="restriction" required placeholder="Shellfish, Vegetarian, Gluten…" /></Field>
                  <Field label="Severity" name="severity">
                    <Select id="severity" name="severity" defaultValue="ALLERGY">{Object.entries(DIETARY_SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select>
                  </Field>
                  <Field label="Guest name" name="guestName" hint="optional"><Input id="guestName" name="guestName" /></Field>
                  <Field label="How many guests" name="count"><Input id="count" name="count" type="number" min={1} defaultValue={1} /></Field>
                </FormGrid>
                <Field label="Notes" name="notes"><Input id="notes" name="notes" placeholder="Carries EpiPen; separate board" /></Field>
              </ActionDialog>
            }
          />
          <CardBody>
            {sorted.length === 0 ? (
              <p className="text-sm text-ink-3">No dietary needs recorded.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {sorted.map((g) => {
                  const sev = metaOf(DIETARY_SEVERITY, g.severity);
                  return (
                    <li key={g.id} className="flex items-center gap-3 py-3">
                      {g.severity.includes("ALLERGY") ? <TriangleAlert className="h-5 w-5 shrink-0 text-clay" /> : <span className="h-5 w-5" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-ink">{g.restriction}{g.count > 1 ? <span className="ml-1.5 text-sm font-normal text-ink-3">× {g.count}</span> : null}</div>
                        <div className="text-xs text-ink-3">{[g.guestName, g.notes].filter(Boolean).join(" · ")}</div>
                      </div>
                      <Badge tone={sev.tone} size="xs">{sev.label}</Badge>
                      <RemoveButton action={removeGuestNote.bind(null, g.id)} label={`Remove ${g.restriction}`} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Dietary summary" description="Free-form notes that show on Day-of mode." />
          <CardBody>
            <ActionForm action={updateEventNotes} hidden={{ id: e.id, criticalNotes: e.criticalNotes ?? "", internalNotes: e.internalNotes ?? "" }}>
              <Textarea name="dietarySummary" rows={3} defaultValue={e.dietarySummary ?? ""} aria-label="Dietary summary" />
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
