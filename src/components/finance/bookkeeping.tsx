import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Receipt } from "lucide-react";
import { db } from "@/lib/server/db";
import { addDays, addMonths, formatDate, fromISODate, toISODate, type ISODate } from "@/lib/domain/dates";
import { centsToInput, formatMoney } from "@/lib/domain/money";
import { EXPENSE_CATEGORY, EXPENSE_CATEGORY_ORDER } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { ReceiptInput } from "@/components/finance/receipt-input";
import { MoneyHeader } from "@/components/finance/money-header";
import { QuickAddButton } from "@/components/shell/quick-add";
import { saveExpense } from "@/app/(app)/money/actions";
import { removeExpense } from "@/app/(app)/events/actions/finance";

type EventOption = { id: string; name: string; date: Date };

function ExpenseFields({ x, events }: { x: { amountCents: number; category: string; eventId: string | null; date: Date | null; vendor: string | null; paymentMethod: string | null; notes: string | null; receipt: { id: string } | null }; events: EventOption[] }) {
  return (
    <>
      <FormGrid>
        <Field label="Amount" name="amount"><MoneyInput id="amount" name="amount" required defaultValue={centsToInput(x.amountCents)} /></Field>
        <Field label="Category" name="category">
          <Select id="category" name="category" defaultValue={x.category}>
            {EXPENSE_CATEGORY_ORDER.map((k) => <option key={k} value={k}>{EXPENSE_CATEGORY[k]}</option>)}
          </Select>
        </Field>
        <Field label="Event" name="eventId" hint="optional">
          <Select id="eventId" name="eventId" defaultValue={x.eventId ?? ""}>
            <option value="">No event — general business</option>
            {events.map((e) => <option key={e.id} value={e.id}>{formatDate.short(toISODate(e.date))} · {e.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" name="date"><Input id="date" name="date" type="date" defaultValue={x.date ? toISODate(x.date) : ""} /></Field>
        <Field label="Vendor" name="vendor"><Input id="vendor" name="vendor" defaultValue={x.vendor ?? ""} /></Field>
        <Field label="Paid with" name="paymentMethod"><Input id="paymentMethod" name="paymentMethod" defaultValue={x.paymentMethod ?? ""} /></Field>
      </FormGrid>
      <Field label="Notes" name="notes"><Input id="notes" name="notes" defaultValue={x.notes ?? ""} /></Field>
      <ReceiptInput existingUrl={x.receipt ? `/receipts/${x.receipt.id}` : null} />
    </>
  );
}

/** Money in and money out for one month — every number here is a real, editable record. */
export async function Bookkeeping({ month: raw, today }: { month?: string; today: ISODate }) {
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : today.slice(0, 7);
  const from = `${month}-01`;
  const to = addDays(addMonths(from, 1), -1);
  const [payments, expenses, historical, events] = await Promise.all([
    db.payment.findMany({
      where: { receivedOn: { gte: fromISODate(from), lte: fromISODate(to) } },
      orderBy: { receivedOn: "asc" },
      select: { id: true, kind: true, amountCents: true, salesTaxCents: true, receivedOn: true, method: true, event: { select: { id: true, name: true } } },
    }),
    db.eventExpense.findMany({
      where: { kind: "ACTUAL", OR: [{ date: { gte: fromISODate(from), lte: fromISODate(to) } }, { date: null, createdAt: { gte: fromISODate(from), lt: fromISODate(addDays(to, 1)) } }] },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: { event: { select: { id: true, name: true } }, receipt: { select: { id: true } } },
    }),
    db.historicalRevenue.findUnique({ where: { month: fromISODate(from) } }),
    db.event.findMany({
      where: { status: { notIn: ["CANCELLED", "INQUIRY"] }, date: { gte: fromISODate(addDays(from, -120)), lte: fromISODate(addDays(to, 365)) } },
      orderBy: { date: "asc" },
      select: { id: true, name: true, date: true },
    }),
  ]);

  const nonTip = payments.filter((p) => p.kind !== "TIP");
  const revenue = nonTip.reduce((s, p) => s + p.amountCents - p.salesTaxCents, 0);
  const tax = nonTip.reduce((s, p) => s + p.salesTaxCents, 0);
  const tips = payments.filter((p) => p.kind === "TIP").reduce((s, p) => s + p.amountCents, 0);
  const spent = expenses.reduce((s, x) => s + x.amountCents, 0);
  const byCategory = Object.entries(expenses.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.category]: (acc[x.category] ?? 0) + x.amountCents }), {})).sort((a, b) => b[1] - a[1]);
  const missingReceipts = expenses.filter((x) => !x.receipt).length;
  const nav = (m: string) => `/money?tab=bookkeeping&month=${m}`;
  const $ = (c: number) => formatMoney(c, { exact: true });

  return (
    <div className="space-y-6">
      <MoneyHeader tab="bookkeeping" />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link href={nav(addMonths(from, -1).slice(0, 7))} className="rounded-lg p-2 text-ink-3 hover:bg-sand" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></Link>
          <h2 className="min-w-[10rem] text-center font-display text-[1.5rem]">{formatDate.month(from)}</h2>
          <Link href={nav(addMonths(from, 1).slice(0, 7))} className="rounded-lg p-2 text-ink-3 hover:bg-sand" aria-label="Next month"><ChevronRight className="h-5 w-5" /></Link>
        </div>
        <QuickAddButton label="Add expense" />
      </div>

      {historical && (
        <p className="rounded-2xl border border-amber/20 bg-amber-soft/50 px-4 py-3 text-sm text-ink-2">
          This month’s revenue comes from your historical entry of <strong className="font-medium text-ink">{$(historical.amountCents)}</strong>. Payments listed below are already inside that total and aren’t counted twice.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Money in", $(revenue), "client payments, before sales tax"],
          ["Sales tax collected", $(tax), "owed to Florida"],
          ["Money out", $(spent), `${expenses.length} expense${expenses.length === 1 ? "" : "s"}${missingReceipts ? ` · ${missingReceipts} without receipt` : ""}`],
          ["In minus out", $(revenue - spent), "cash difference — not profit"],
        ].map(([k, v, n]) => (
          <Card key={k} className="p-4 sm:p-5">
            <div className="text-[0.8125rem] text-ink-3">{k}</div>
            <div className="mt-1.5 font-display text-[1.6rem] leading-none tabular sm:text-[1.9rem]">{v}</div>
            <div className="mt-1.5 text-xs text-ink-3">{n}</div>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Money in" description={tips ? `Plus ${$(tips)} in tips (tracked separately)` : "Client payments recorded on events"} />
          <CardBody>
            <ul className="divide-y divide-line/70 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/events/${p.event.id}?tab=financials`} className="block truncate font-medium hover:text-wine">{p.event.name}</Link>
                    <div className="text-xs text-ink-3">{formatDate.medium(toISODate(p.receivedOn))} · {p.kind === "TIP" ? "Tip" : p.kind[0] + p.kind.slice(1).toLowerCase()}{p.method ? ` · ${p.method}` : ""}{p.salesTaxCents ? ` · incl. ${$(p.salesTaxCents)} sales tax` : ""}</div>
                  </div>
                  <span className="tabular">{$(p.amountCents)}</span>
                </li>
              ))}
              {payments.length === 0 && <li className="py-6 text-center text-ink-3">No payments recorded this month.</li>}
            </ul>
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Money out" description="Every expense — for an event or general business" />
          <CardBody>
            <ul className="divide-y divide-line/70 text-sm">
              {expenses.map((x) => (
                <li key={x.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{x.vendor ?? x.description}</div>
                    <div className="truncate text-xs text-ink-3">
                      {x.date ? formatDate.medium(toISODate(x.date)) : "no date"} · {EXPENSE_CATEGORY[x.category] ?? x.category} ·{" "}
                      {x.event ? <Link href={`/events/${x.event.id}?tab=financials`} className="hover:text-wine">{x.event.name}</Link> : "General"}
                    </div>
                  </div>
                  {x.receipt && <a href={`/receipts/${x.receipt.id}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-ink-3 hover:bg-sand hover:text-wine" aria-label="View receipt"><Receipt className="h-4 w-4" /></a>}
                  <span className="w-24 text-right tabular">{$(x.amountCents)}</span>
                  <ActionDialog trigger={<Pencil className="h-3.5 w-3.5" />} triggerLabel="Edit expense" triggerVariant="ghost" triggerSize="icon" title="Edit expense" action={saveExpense} hidden={{ id: x.id }} wide>
                    <ExpenseFields x={x} events={events} />
                  </ActionDialog>
                  <RemoveButton action={removeExpense.bind(null, x.id)} label="Remove expense" />
                </li>
              ))}
              {expenses.length === 0 && <li className="py-6 text-center text-ink-3">No expenses recorded this month.</li>}
            </ul>
            {byCategory.length > 1 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {byCategory.map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-sand/50 px-3 py-2 text-xs">
                    <div className="text-ink-3">{EXPENSE_CATEGORY[k] ?? k}</div>
                    <div className="text-sm tabular">{$(v)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
