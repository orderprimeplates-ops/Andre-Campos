"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Banknote, CalendarPlus, Inbox, Receipt, UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { ReceiptInput } from "@/components/finance/receipt-input";
import { EXPENSE_CATEGORY, EXPENSE_CATEGORY_ORDER } from "@/lib/status";
import { centsToInput, formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { salesTaxPortion } from "@/lib/domain/finance";
import { quickAddEvents, saveExpense, type QuickAddEvent } from "@/app/(app)/money/actions";
import { addPayment } from "@/app/(app)/events/actions/finance";

const OPEN_EVENT = "pp:quick-add";
const LAST_CATEGORY = "pp-last-expense-category";

export function openQuickAdd() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Step = "menu" | "expense" | "payment";


/** The universal + Add: one place to record money and start new work, from anywhere in HQ. */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [events, setEvents] = useState<QuickAddEvent[] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [, start] = useTransition();
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const onOpen = () => {
      setStep("menu");
      setFormKey((k) => k + 1);
      setOpen(true);
      start(async () => {
        const r = await quickAddEvents();
        setEvents(r.events);
        setToday(r.today);
      });
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const go = (s: Step) => {
    setFormKey((k) => k + 1);
    setStep(s);
  };
  const close = () => setOpen(false);
  const title = step === "expense" ? "New expense" : step === "payment" ? "Record a payment" : "Add";

  return (
    <Dialog open={open} onClose={close} title={title}>
      {step !== "menu" && (
        <button type="button" onClick={() => setStep("menu")} className="-mt-1 mb-3 flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
      )}
      {step === "menu" && (
        <div className="grid grid-cols-2 gap-2.5">
          <MenuButton icon={Receipt} label="New expense" hint="seconds" onClick={() => go("expense")} />
          <MenuButton icon={Banknote} label="Record payment" hint="from a client" onClick={() => go("payment")} />
          <MenuLink icon={CalendarPlus} label="New event" href="/events/new" onClick={close} />
          <MenuLink icon={UserPlus} label="New client" href="/clients/new" onClick={close} />
          <MenuLink icon={Inbox} label="New lead" href="/leads/new" onClick={close} />
        </div>
      )}
      {step === "expense" && <ExpenseForm key={formKey} events={events} today={today} onDone={close} />}
      {step === "payment" && <PaymentForm key={formKey} events={events} today={today} onDone={close} />}
    </Dialog>
  );
}

function MenuButton({ icon: Icon, label, hint, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-ivory px-4 py-4 text-left transition-colors hover:border-line-strong active:bg-sand">
      <Icon className="h-5 w-5 text-wine" />
      <span className="font-medium">{label}</span>
      {hint && <span className="-mt-1.5 text-xs text-ink-3">{hint}</span>}
    </button>
  );
}

function MenuLink({ icon: Icon, label, href, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex flex-col items-start gap-2 rounded-2xl border border-line bg-ivory px-4 py-4 transition-colors hover:border-line-strong active:bg-sand">
      <Icon className="h-5 w-5 text-ink-3" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

/** Date field that fills in "today" (business timezone) once it's known, without resetting the form. */
function useTodayDate(today: string | null) {
  const [date, setDate] = useState(today ?? "");
  const [synced, setSynced] = useState(!!today);
  if (today && !synced) {
    setSynced(true);
    if (!date) setDate(today);
  }
  return [date, setDate] as const;
}

function eventLabel(e: QuickAddEvent) {
  return `${formatDate.short(e.date)} · ${e.name}`;
}

function ExpenseForm({ events, today, onDone }: { events: QuickAddEvent[] | null; today: string | null; onDone: () => void }) {
  const [category, setCategory] = useState("FOOD");
  const [date, setDate] = useTodayDate(today);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_CATEGORY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the remembered category once, after mount
      if (saved && saved in EXPENSE_CATEGORY) setCategory(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const remember = (v: string) => {
    setCategory(v);
    try {
      localStorage.setItem(LAST_CATEGORY, v);
    } catch {
      /* storage unavailable */
    }
  };
  const past = (events ?? []).filter((e) => e.past).reverse();
  const upcoming = (events ?? []).filter((e) => !e.past);

  return (
    <ActionForm action={saveExpense} submitLabel="Save expense" onSuccess={onDone} onCancel={onDone}>
      <Field label="Amount" name="amount"><MoneyInput id="amount" name="amount" required autoFocus /></Field>
      <FormGrid>
        <Field label="Category" name="category">
          <Select id="category" name="category" value={category} onChange={(e) => remember(e.target.value)}>
            {EXPENSE_CATEGORY_ORDER.map((k) => <option key={k} value={k}>{EXPENSE_CATEGORY[k]}</option>)}
          </Select>
        </Field>
        <Field label="Event" name="eventId" hint="optional">
          <Select id="eventId" name="eventId" defaultValue="">
            <option value="">No event — general business</option>
            {past.length > 0 && <optgroup label="Recent events">{past.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}</optgroup>}
            {upcoming.length > 0 && <optgroup label="Upcoming events">{upcoming.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}</optgroup>}
          </Select>
        </Field>
      </FormGrid>
      <Field label="Date" name="date"><Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <details className="group rounded-xl border border-line px-3.5 py-2.5">
        <summary className="cursor-pointer text-sm font-medium text-ink-2">More details <span className="font-normal text-ink-4">vendor, receipt, payment method, notes</span></summary>
        <div className="mt-3 space-y-4">
          <FormGrid>
            <Field label="Vendor" name="vendor"><Input id="vendor" name="vendor" placeholder="Restaurant Depot" /></Field>
            <Field label="Paid with" name="paymentMethod"><Input id="paymentMethod" name="paymentMethod" placeholder="Business card" list="qa-methods" /></Field>
          </FormGrid>
          <datalist id="qa-methods">{["Business card", "Business debit", "Cash", "Zelle", "Personal card (reimburse)"].map((m) => <option key={m} value={m} />)}</datalist>
          <Field label="Notes" name="notes"><Input id="notes" name="notes" /></Field>
          <ReceiptInput />
        </div>
      </details>
      <label className="flex items-center gap-2 text-xs text-ink-3"><input type="checkbox" name="allowDuplicate" className="h-3.5 w-3.5 accent-[var(--color-wine)]" />This is a separate expense (same amount, category and date as one already recorded)</label>
    </ActionForm>
  );
}

function PaymentForm({ events, today, onDone }: { events: QuickAddEvent[] | null; today: string | null; onDone: () => void }) {
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [kind, setKind] = useState("DEPOSIT");
  const [date, setDate] = useTodayDate(today);
  const owing = (events ?? []).filter((e) => e.balanceCents > 0);
  const others = (events ?? []).filter((e) => e.balanceCents <= 0);
  const ev = events?.find((e) => e.id === eventId);

  function pick(id: string) {
    setEventId(id);
    const e = events?.find((x) => x.id === id);
    if (!e) return;
    const due = e.depositOutstandingCents || e.balanceCents;
    setKind(e.depositOutstandingCents > 0 ? "DEPOSIT" : "BALANCE");
    setAmount(due ? centsToInput(due) : "");
    setTax(e.salesTaxCents && due ? centsToInput(salesTaxPortion(due, e)) : "");
  }

  return (
    <ActionForm action={addPayment} submitLabel="Record payment" onSuccess={onDone} onCancel={onDone}>
      <Field label="Event" name="eventId">
        <Select id="eventId" name="eventId" required value={eventId} onChange={(e) => pick(e.target.value)}>
          <option value="" disabled>{events ? "Choose the event…" : "Loading events…"}</option>
          {owing.length > 0 && <optgroup label="Still owed">{owing.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)} — {formatMoney(e.balanceCents)} due</option>)}</optgroup>}
          {others.length > 0 && <optgroup label="Paid in full">{others.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}</optgroup>}
        </Select>
      </Field>
      {ev && <p className="-mt-2 text-xs text-ink-3">{ev.clientName} · {formatMoney(ev.balanceCents)} still owed{ev.salesTaxCents ? " (incl. sales tax)" : ""}</p>}
      <FormGrid>
        <Field label="Amount received" name="amount"><MoneyInput id="amount" name="amount" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Type" name="kind">
          <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="DEPOSIT">Deposit</option><option value="BALANCE">Balance</option><option value="TIP">Tip / gratuity</option><option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Received" name="receivedOn"><Input id="receivedOn" name="receivedOn" type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Method" name="method"><Input id="method" name="method" placeholder="Zelle, check, card…" list="qa-pay-methods" /></Field>
        {kind !== "TIP" && (
          <Field label="Sales tax included" name="salesTax" hint="kept out of revenue"><MoneyInput id="salesTax" name="salesTax" placeholder="0" value={tax} onChange={(e) => setTax(e.target.value)} /></Field>
        )}
      </FormGrid>
      <datalist id="qa-pay-methods">{["Zelle", "Venmo", "Check", "Card", "Cash", "ACH", "Platform"].map((m) => <option key={m} value={m} />)}</datalist>
      <label className="flex items-center gap-2 text-xs text-ink-3"><input type="checkbox" name="allowDuplicate" className="h-3.5 w-3.5 accent-[var(--color-wine)]" />This is a separate payment (same amount and date as one already recorded)</label>
    </ActionForm>
  );
}

/** A button anywhere on a page that opens + Add. */
export function QuickAddButton({ label = "Add", className }: { label?: string; className?: string }) {
  return (
    <button type="button" onClick={openQuickAdd} className={className ?? "inline-flex h-9 items-center gap-1.5 rounded-xl bg-espresso px-3.5 text-sm font-medium text-linen hover:bg-ink"}>
      <span aria-hidden>+</span>{label}
    </button>
  );
}
