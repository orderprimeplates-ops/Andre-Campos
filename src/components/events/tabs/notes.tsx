import { ImagePlus } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { toISODate, type ISODate } from "@/lib/domain/dates";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Select, Textarea, YesNoUnknown } from "@/components/ui/field";
import { saveReview, updateEventNotes } from "@/app/(app)/events/actions/core";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export function NotesTab({ ws, today }: { ws: WS; today: ISODate }) {
  const { event: e } = ws;
  const r = e.review;
  const past = toISODate(e.date) <= today;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Event notes" />
          <CardBody>
            <ActionForm action={updateEventNotes} hidden={{ id: e.id, dietarySummary: e.dietarySummary ?? "" }}>
              <Field label="Critical notes" name="criticalNotes" hint="shown large in Day-of mode">
                <Textarea id="criticalNotes" name="criticalNotes" rows={4} defaultValue={e.criticalNotes ?? ""} placeholder="Allergy seat 1 · speeches at 8:15 · hold dessert" />
              </Field>
              <Field label="Internal notes" name="internalNotes" hint="private">
                <Textarea id="internalNotes" name="internalNotes" rows={5} defaultValue={e.internalNotes ?? ""} />
              </Field>
            </ActionForm>
          </CardBody>
        </Card>
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-line-strong/60 px-4 py-3 text-xs text-ink-3">
          <ImagePlus className="h-4 w-4 shrink-0" />
          Event & plating photos arrive once file storage is connected. The data model is ready.
        </div>
      </div>

      <Card>
        <CardHeader eyebrow="Post-event review" title={past ? "How did it go?" : "After the event"} description={past ? "Five minutes now makes the next event better." : "Fill this in after service — it feeds future menus and analytics."} />
        <CardBody>
          <ActionForm action={saveReview} hidden={{ eventId: e.id }} submitLabel="Save review">
            <FormGrid>
              <Field label="What went well?" name="wentWell"><Textarea id="wentWell" name="wentWell" rows={3} defaultValue={r?.wentWell ?? ""} /></Field>
              <Field label="What went wrong?" name="wentWrong"><Textarea id="wentWrong" name="wentWrong" rows={3} defaultValue={r?.wentWrong ?? ""} /></Field>
              <Field label="What did the client love?" name="clientLoved"><Textarea id="clientLoved" name="clientLoved" rows={3} defaultValue={r?.clientLoved ?? ""} /></Field>
              <Field label="What should change next time?" name="changeNextTime"><Textarea id="changeNextTime" name="changeNextTime" rows={3} defaultValue={r?.changeNextTime ?? ""} /></Field>
              <Field label="What ran out?" name="ranOut"><Textarea id="ranOut" name="ranOut" rows={2} defaultValue={r?.ranOut ?? ""} /></Field>
              <Field label="Excessive leftovers?" name="excessLeftovers"><Textarea id="excessLeftovers" name="excessLeftovers" rows={2} defaultValue={r?.excessLeftovers ?? ""} /></Field>
            </FormGrid>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Serve this menu again?" name="serveMenuAgain"><YesNoUnknown name="serveMenuAgain" defaultValue={r?.serveMenuAgain} /></Field>
              <Field label="Take this client again?" name="takeClientAgain"><YesNoUnknown name="takeClientAgain" defaultValue={r?.takeClientAgain} /></Field>
              <Field label="Overall" name="rating">
                <Select id="rating" name="rating" defaultValue={r?.rating ? String(r.rating) : ""}>
                  <option value="">—</option>
                  {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Operational notes" name="operationalNotes"><Textarea id="operationalNotes" name="operationalNotes" rows={2} defaultValue={r?.operationalNotes ?? ""} /></Field>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
