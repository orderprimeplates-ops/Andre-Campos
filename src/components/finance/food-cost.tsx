import { Pencil, Plus, Receipt } from "lucide-react";
import { formatDate, toISODate, type ISODate } from "@/lib/domain/dates";
import { centsToInput, formatMoney, formatPct } from "@/lib/domain/money";
import { foodCostVariance, type actualEvent } from "@/lib/domain/finance";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { ReceiptInput } from "@/components/finance/receipt-input";
import { removeExpense, saveFoodCost } from "@/app/(app)/events/actions/finance";

export interface FoodCostEntry {
  id: string;
  amountCents: number;
  vendor: string | null;
  date: Date | null;
  notes: string | null;
  receipt: { id: string } | null;
}

export function FoodCostFields({ entry, vendors, today }: { entry?: FoodCostEntry; vendors: string[]; today: ISODate }) {
  return (
    <>
      <Field label="Amount spent" name="amount">
        <MoneyInput id="amount" name="amount" required autoFocus placeholder="487.36" defaultValue={entry ? centsToInput(entry.amountCents) : undefined} />
      </Field>
      <FormGrid>
        <Field label="Store / vendor" name="vendor" hint="optional">
          <Input id="vendor" name="vendor" list="food-cost-vendors" placeholder="Sam’s Club" defaultValue={entry?.vendor ?? ""} />
        </Field>
        <Field label="Purchase date" name="date" hint="optional">
          <Input id="date" name="date" type="date" max={today} defaultValue={entry?.date ? toISODate(entry.date) : ""} />
        </Field>
      </FormGrid>
      <datalist id="food-cost-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
      <Field label="Notes" name="notes" hint="optional"><Input id="notes" name="notes" placeholder="Proteins + produce" defaultValue={entry?.notes ?? ""} /></Field>
      <ReceiptInput existingUrl={entry?.receipt ? `/receipts/${entry.receipt.id}` : null} />
    </>
  );
}

/** "+ Add Food Cost" — usable from the event header or the Financials tab. */
export function AddFoodCostButton({ eventId, vendors, today, size = "sm", successHref }: { eventId: string; vendors: string[]; today: ISODate; size?: "sm" | "md"; successHref?: string }) {
  return (
    <ActionDialog
      trigger={<><Plus className="h-4 w-4" />Add Food Cost</>}
      triggerVariant="primary"
      triggerSize={size}
      title="Add food cost"
      description="What you actually spent on groceries for this event. Add one entry per store."
      action={saveFoodCost}
      hidden={{ eventId }}
      submitLabel="Save food cost"
      successHref={successHref}
    >
      <FoodCostFields vendors={vendors} today={today} />
    </ActionDialog>
  );
}

type Actual = ReturnType<typeof actualEvent>;

/** Quick Food Cost: grocery entries, estimated vs actual, and the event's resulting profitability. */
export function FoodCostCard({
  eventId, entries, estimatedFoodCents, actual, collectedCents, vendors, today,
}: {
  eventId: string;
  entries: FoodCostEntry[];
  estimatedFoodCents: number;
  actual: Actual;
  collectedCents: number;
  vendors: string[];
  today: ISODate;
}) {
  const totalCents = entries.reduce((s, x) => s + x.amountCents, 0);
  const actualFood = entries.length ? totalCents : actual.actualFoodCents;
  const v = foodCostVariance(estimatedFoodCents, actualFood);

  const tiles: [string, string, string | null][] = [
    ["Actual food cost", actualFood === null ? "—" : formatMoney(actualFood, { exact: true }), actualFood === null ? "nothing entered yet" : actual.foodSource === "shopping" ? "from Shopping-mode prices" : `${entries.length} purchase${entries.length === 1 ? "" : "s"}`],
    ["Food cost %", formatPct(actualFood === null ? null : actual.foodCostPct, 1), "of event revenue"],
    ["Net event profit", formatMoney(actual.profitCents), actual.marginPct === null ? null : `${formatPct(actual.marginPct, 1)} profit margin`],
  ];

  return (
    <Card id="food-cost">
      <CardHeader
        eyebrow="Quick food cost"
        title="Food cost"
        description="Enter what you spent — no recipes or shopping list needed."
        action={<AddFoodCostButton eventId={eventId} vendors={vendors} today={today} />}
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {tiles.map(([k, val, note]) => (
            <div key={k} className="min-w-0 rounded-2xl bg-sand/50 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="text-xs text-ink-3 sm:text-[0.8125rem]">{k}</div>
              <div className="mt-1 font-display text-[1.3rem] leading-none tabular sm:text-[1.75rem]">{val}</div>
              {note && <div className="mt-1 text-[0.6875rem] leading-snug text-ink-3 sm:text-xs">{note}</div>}
            </div>
          ))}
        </div>

        {entries.length > 0 && (
          <ul className="divide-y divide-line/70 border-y border-line/70 text-sm">
            {entries.map((x) => (
              <li key={x.id} className="flex items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{x.vendor ?? "Groceries"}</div>
                  <div className="truncate text-xs text-ink-3">{[x.date ? formatDate.medium(toISODate(x.date)) : null, x.notes].filter(Boolean).join(" · ") || " "}</div>
                </div>
                {x.receipt && (
                  <a href={`/receipts/${x.receipt.id}`} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-ink-3 hover:bg-sand hover:text-wine" aria-label="View receipt" title="View receipt"><Receipt className="h-4 w-4" /></a>
                )}
                <span className="w-24 text-right tabular">{formatMoney(x.amountCents, { exact: true })}</span>
                <ActionDialog trigger={<Pencil className="h-3.5 w-3.5" />} triggerLabel="Edit food cost" triggerVariant="ghost" triggerSize="icon" title="Edit food cost" action={saveFoodCost} hidden={{ id: x.id }}>
                  <FoodCostFields entry={x} vendors={vendors} today={today} />
                </ActionDialog>
                <RemoveButton action={removeExpense.bind(null, x.id)} label="Remove food cost" />
              </li>
            ))}
            <li className="flex items-center justify-between py-2.5 font-medium">
              <span>Total actual food cost</span>
              <span className="tabular">{formatMoney(totalCents, { exact: true })}</span>
            </li>
          </ul>
        )}

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-ink-3">Estimated <span className="text-ink-4">from menu</span></dt><dd className="tabular">{estimatedFoodCents > 0 ? formatMoney(estimatedFoodCents, { exact: true }) : "—"}</dd></div>
          <div><dt className="text-xs text-ink-3">Actual</dt><dd className="tabular">{actualFood === null ? "—" : formatMoney(actualFood, { exact: true })}</dd></div>
          <div>
            <dt className="text-xs text-ink-3">Variance</dt>
            <dd className={cn("tabular", v.varianceCents !== null && estimatedFoodCents > 0 && (v.varianceCents > 0 ? "text-clay" : "text-sage"))}>
              {v.varianceCents === null || estimatedFoodCents <= 0 ? "—" : `${v.varianceCents > 0 ? "+" : ""}${formatMoney(v.varianceCents, { exact: true })}`}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-ink-4">
          Profit = event revenue {formatMoney(actual.revenueCents)}
          {actual.revenueBasis === "booked" && collectedCents < actual.revenueCents ? ` (booked price — ${formatMoney(actual.revenueCents - collectedCents)} not yet collected)` : ""}
          {" "}− {actualFood === null ? (actual.foodSource === "estimate" ? "estimated food" : "food") : "actual food"} − labor{actual.laborSource === "projected" ? " (scheduled)" : ""} − rentals, supplies & other costs − platform fees.
          {actualFood !== null && estimatedFoodCents > 0 ? " The menu estimate is shown for comparison only and is never added on top." : ""}
        </p>
      </CardBody>
    </Card>
  );
}
