import { Download, Pencil, Plus, ShieldCheck } from "lucide-react";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { getCurrentUser } from "@/lib/server/auth";
import { backupSummary } from "@/lib/server/backup";
import { centsToInput, formatMoney } from "@/lib/domain/money";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Textarea } from "@/components/ui/field";
import { changePassword, saveBusinessSettings, savePlatform, saveVendor } from "./actions";

export const metadata = { title: "Settings" };

type P = Awaited<ReturnType<typeof db.platform.findMany>>[number];

function PlatformFields({ p }: { p?: P }) {
  return (
    <div className="space-y-4">
      <Field label="Platform name" name="name"><Input id="name" name="name" required defaultValue={p?.name} /></Field>
      <FormGrid>
        <Field label="Commission %" name="commissionPct"><Input id="commissionPct" name="commissionPct" inputMode="decimal" defaultValue={p?.commissionPct ?? 0} /></Field>
        <Field label="Fixed fee per booking" name="fixedFee"><MoneyInput id="fixedFee" name="fixedFee" defaultValue={centsToInput(p?.fixedFeeCents ?? 0)} /></Field>
        <Field label="Payment processing %" name="processingPct"><Input id="processingPct" name="processingPct" inputMode="decimal" defaultValue={p?.processingPct ?? 0} /></Field>
        <Field label="Processing fixed fee" name="processingFixed"><MoneyInput id="processingFixed" name="processingFixed" defaultValue={centsToInput(p?.processingFixedCents ?? 0)} /></Field>
      </FormGrid>
      <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={p?.notes ?? ""} /></Field>
      {p && <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-[var(--color-wine)]" />Active</label>}
    </div>
  );
}

export default async function SettingsPage() {
  const [s, platforms, vendors, user, backup] = await Promise.all([
    getSettings(),
    db.platform.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { events: true } } } }),
    db.vendor.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { ingredients: true } } } }),
    getCurrentUser(),
    backupSummary(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Business" title="Settings" description="Your rules. Pricing recommendations, warnings and deadlines all follow these." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Business rules" />
          <CardBody>
            <ActionForm action={saveBusinessSettings} submitLabel="Save rules">
              <FormGrid>
                <Field label="Business name" name="businessName"><Input id="businessName" name="businessName" defaultValue={s.businessName} /></Field>
                <Field label="Your first name" name="ownerName" hint="for the greeting"><Input id="ownerName" name="ownerName" defaultValue={s.ownerName} /></Field>
                <Field label="Target margin %" name="targetMarginPct" hint="recommended price"><Input id="targetMarginPct" name="targetMarginPct" inputMode="decimal" defaultValue={s.targetMarginPct} /></Field>
                <Field label="Minimum margin %" name="minimumMarginPct" hint="low-margin warning"><Input id="minimumMarginPct" name="minimumMarginPct" inputMode="decimal" defaultValue={s.minimumMarginPct} /></Field>
                <Field label="Target food cost %" name="targetFoodCostPct"><Input id="targetFoodCostPct" name="targetFoodCostPct" inputMode="decimal" defaultValue={s.targetFoodCostPct} /></Field>
                <Field label="Mileage rate per mile" name="mileageRate"><MoneyInput id="mileageRate" name="mileageRate" defaultValue={centsToInput(s.mileageRateCents)} /></Field>
                <Field label="Default deposit %" name="defaultDepositPct"><Input id="defaultDepositPct" name="defaultDepositPct" inputMode="decimal" defaultValue={s.defaultDepositPct} /></Field>
                <Field label="Final count due (days before)" name="finalCountLeadDays"><Input id="finalCountLeadDays" name="finalCountLeadDays" type="number" min={0} defaultValue={s.finalCountLeadDays} /></Field>
                <Field label="Your hourly rate" name="ownerHourlyRate" hint="optional · costs your hours on events"><MoneyInput id="ownerHourlyRate" name="ownerHourlyRate" placeholder="0" defaultValue={s.ownerHourlyRateCents ? centsToInput(s.ownerHourlyRateCents) : ""} /></Field>
                <Field label="Overhead per event" name="overheadPerEvent" hint="optional · share of fixed costs"><MoneyInput id="overheadPerEvent" name="overheadPerEvent" placeholder="0" defaultValue={s.overheadPerEventCents ? centsToInput(s.overheadPerEventCents) : ""} /></Field>
                <Field label="Default Historical Profit Margin %" name="historicalMarginPct" hint="estimates profit for historical months" className="sm:col-span-2"><Input id="historicalMarginPct" name="historicalMarginPct" inputMode="decimal" defaultValue={s.historicalMarginPct} /></Field>
                <Field label="Timezone" name="timezone" className="sm:col-span-2"><Input id="timezone" name="timezone" defaultValue={s.timezone} /></Field>
              </FormGrid>
            </ActionForm>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Booking platforms"
              description="Fees change — update them here and every event on that platform recalculates."
              action={<ActionDialog trigger={<><Plus className="h-4 w-4" />Platform</>} triggerSize="sm" title="Add platform" action={savePlatform}><PlatformFields /></ActionDialog>}
            />
            <CardBody>
              <ul className="divide-y divide-line/70">
                {platforms.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-medium">{p.name}{!p.active && <Badge size="xs">inactive</Badge>}</div>
                      <div className="text-xs text-ink-3">
                        {p.commissionPct}% commission{p.fixedFeeCents ? ` + ${formatMoney(p.fixedFeeCents)}` : ""} · {p.processingPct}% processing{p.processingFixedCents ? ` + ${formatMoney(p.processingFixedCents, { exact: true })}` : ""} · {p._count.events} event{p._count.events === 1 ? "" : "s"}
                      </div>
                      {p.notes && <div className="text-xs italic text-ink-4">{p.notes}</div>}
                    </div>
                    <ActionDialog trigger={<Pencil className="h-4 w-4" />} triggerLabel={`Edit ${p.name}`} triggerVariant="ghost" triggerSize="icon" title={`Edit ${p.name}`} action={savePlatform} hidden={{ id: p.id }}><PlatformFields p={p} /></ActionDialog>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Stores & vendors"
              action={<ActionDialog trigger={<><Plus className="h-4 w-4" />Store</>} triggerSize="sm" title="Add store" action={saveVendor}><Field label="Store name" name="name"><Input id="name" name="name" required /></Field><Field label="Notes" name="notes"><Input id="notes" name="notes" placeholder="Hours, membership #…" /></Field></ActionDialog>}
            />
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {vendors.map((v) => (
                  <ActionDialog key={v.id} trigger={<>{v.name} <span className="text-ink-4">{v._count.ingredients}</span></>} triggerClassName="rounded-full border border-line bg-ivory px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong" title={`Edit ${v.name}`} action={saveVendor} hidden={{ id: v.id }}>
                    <Field label="Store name" name="name"><Input id="name" name="name" required defaultValue={v.name} /></Field>
                    <Field label="Notes" name="notes"><Input id="notes" name="notes" defaultValue={v.notes ?? ""} /></Field>
                  </ActionDialog>
                ))}
              </div>
            </CardBody>
          </Card>

          {user?.role === "OWNER" && (
            <Card>
              <CardHeader title="Backup" description="Download a complete copy of everything in HQ — clients, events, payments, recipes, settings and receipts. Keep it somewhere safe." />
              <CardBody className="space-y-3">
                <a href="/backup" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-espresso px-4 text-sm font-medium text-linen hover:bg-ink"><Download className="h-4 w-4" />Download full backup</a>
                {backup.receiptParts > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs text-ink-3">Receipt photos ({backup.receipts}) — download {backup.receiptParts === 1 ? "this file" : `all ${backup.receiptParts} files`} too:</div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: backup.receiptParts }, (_, i) => (
                        <a key={i} href={`/backup/receipts?part=${i + 1}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong/70 px-3 text-sm text-ink-2 hover:bg-sand"><Download className="h-3.5 w-3.5" />Receipts {i + 1} of {backup.receiptParts}</a>
                      ))}
                    </div>
                  </div>
                )}
                <p className="flex items-start gap-1.5 text-xs text-ink-3"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" />The file contains private client and financial details — store it like a bank statement. Restoring it needs a technical hand (see docs/BACKUP.md).</p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Your password" />
            <CardBody>
              <ActionForm action={changePassword} submitLabel="Change password" resetOnSuccess>
                <FormGrid>
                  <Field label="Current" name="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
                  <Field label="New" name="next" hint="10+ characters"><Input id="next" name="next" type="password" autoComplete="new-password" required /></Field>
                </FormGrid>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
