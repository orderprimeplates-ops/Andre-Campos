import { Plus } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { db } from "@/lib/server/db";
import { getEventShopping } from "@/lib/server/shopping";
import { actualEvent, mileageCost, type ExpenseInput } from "@/lib/domain/finance";
import { formatDate, toISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { EXPENSE_CATEGORY, PAYMENT_STATUS, metaOf } from "@/lib/status";
import { cn } from "@/lib/cn";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/misc";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { RemoveButton } from "@/components/ui/remove-button";
import { PriceTester } from "@/components/finance/price-tester";
import { FoodCostCard } from "@/components/finance/food-cost";
import { addExpense, addPayment, removeExpense, removePayment } from "@/app/(app)/events/actions/finance";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

function ExpenseDialog({ eventId, kind, label }: { eventId: string; kind: "PROJECTED" | "ACTUAL"; label: string }) {
  // Food spend has its own quick entry (Food cost card), so it isn't offered here.
  const categories = Object.entries(EXPENSE_CATEGORY).filter(([k]) => (kind === "ACTUAL" ? k !== "FOOD" : !["FOOD", "LABOR", "MILEAGE"].includes(k)));
  return (
    <ActionDialog trigger={<><Plus className="h-3.5 w-3.5" />{label}</>} triggerSize="sm" triggerVariant="quiet" title={kind === "ACTUAL" ? "Add an actual cost" : "Add a projected cost"}
      description={kind === "ACTUAL" ? "Gas, rentals, supplies — what it really cost. Groceries go in Food cost." : "Food and labor are calculated for you. Add everything else here."}
      action={addExpense} hidden={{ eventId, kind }}>
      <FormGrid>
        <Field label="Category" name="category">
          <Select id="category" name="category" defaultValue="RENTALS">{categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </Field>
        <Field label="Amount" name="amount"><MoneyInput id="amount" name="amount" required autoFocus /></Field>
        <Field label={kind === "ACTUAL" ? "Store / vendor" : "Description"} name={kind === "ACTUAL" ? "vendor" : "description"}>
          <Input id={kind === "ACTUAL" ? "vendor" : "description"} name={kind === "ACTUAL" ? "vendor" : "description"} placeholder={kind === "ACTUAL" ? "Party rental co." : "Chair & linen rental"} />
        </Field>
        {kind === "ACTUAL" && <Field label="Date" name="date"><Input id="date" name="date" type="date" /></Field>}
      </FormGrid>
      {kind === "ACTUAL" && <Field label="Note" name="description"><Input id="description" name="description" placeholder="optional" /></Field>}
    </ActionDialog>
  );
}

export async function FinancialsTab({ ws, today }: { ws: WS; today: ISODate }) {
  const { event: e, summary: s, settings } = ws;
  const [platforms, shopping, vendors, historical] = await Promise.all([
    db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getEventShopping(e.id),
    db.vendor.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true } }),
    db.historicalRevenue.findMany({ select: { month: true } }),
  ]);
  const historicalMonths = new Set(historical.map((h) => toISODate(h.month).slice(0, 7)));
  const p = s.projection;
  const projectedLines = e.expenses.filter((x) => x.kind === "PROJECTED");
  const actualLines = e.expenses.filter((x) => x.kind === "ACTUAL");
  const foodLines = actualLines.filter((x) => x.category === "FOOD");
  const otherActualLines = actualLines.filter((x) => x.category !== "FOOD");
  const pay = metaOf(PAYMENT_STATUS, s.payment.status);
  const actual = actualEvent({
    collectedCents: s.payment.collectedCents,
    priceCents: e.priceCents,
    estimatedFoodCents: s.foodCost.cents,
    guestCount: e.guestCount,
    actualExpenses: actualLines as unknown as ExpenseInput[],
    shoppingActualCents: shopping.totals.actualCents,
    assignments: e.staffAssignments,
    platform: e.platform,
  });
  const past = toISODate(e.date) < today;
  const hasActuals = actualLines.length > 0 || shopping.totals.actualCents > 0 || e.staffAssignments.some((a) => a.status === "PAID" || a.status === "COMPLETED");
  // Before the event, a partial deposit isn't "missing revenue" — only compare once there's something real to compare.
  const showActual = past || hasActuals;

  const compare: [string, number | null, number | null, "money" | "pct", boolean][] = [
    ["Revenue", s.priceCents, actual.revenueCents, "money", true],
    ["Total cost", p.totalCostCents, actual.totalCostCents, "money", false],
    ["Profit", p.profitCents, actual.profitCents, "money", true],
    ["Margin", p.marginPct, actual.marginPct, "pct", true],
  ];

  return (
    <div className="space-y-6">
      <FoodCostCard
        eventId={e.id}
        entries={foodLines}
        estimatedFoodCents={s.foodCost.cents}
        actual={actual}
        collectedCents={s.payment.collectedCents}
        vendors={vendors.map((v) => v.name)}
        today={today}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="min-w-0">
          <CardHeader eyebrow="Pricing" title="Price & margin" description="Try prices freely — nothing changes until you choose to use one." />
          <CardBody>
            <PriceTester
              eventId={e.id}
              priceCents={e.priceCents}
              guestCount={e.guestCount}
              foodCostCents={s.foodCost.cents}
              laborCents={s.laborCents}
              roundTripMiles={e.roundTripMiles}
              expenses={projectedLines.map((x) => ({ category: x.category, amountCents: x.amountCents })) as ExpenseInput[]}
              platforms={platforms.map((pl) => ({ id: pl.id, name: pl.name, commissionPct: pl.commissionPct, fixedFeeCents: pl.fixedFeeCents, processingPct: pl.processingPct, processingFixedCents: pl.processingFixedCents }))}
              platformId={e.platformId}
              settings={{ targetMarginPct: settings.targetMarginPct, minimumMarginPct: settings.minimumMarginPct, mileageRateCents: settings.mileageRateCents }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Projected costs" action={<ExpenseDialog eventId={e.id} kind="PROJECTED" label="Cost" />} />
          <CardBody>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-ink-2">Food <span className="text-xs text-ink-4">from menu</span></span><span className="tabular">{formatMoney(s.foodCost.cents)}</span></li>
              <li className="flex justify-between"><span className="text-ink-2">Event labor <span className="text-xs text-ink-4">from staff</span></span><span className="tabular">{formatMoney(s.laborCents)}</span></li>
              {e.roundTripMiles ? (
                <li className="flex justify-between"><span className="text-ink-2">Mileage <span className="text-xs text-ink-4">{e.roundTripMiles} mi × {formatMoney(settings.mileageRateCents, { exact: true })}</span></span><span className="tabular">{formatMoney(mileageCost(e.roundTripMiles, settings.mileageRateCents))}</span></li>
              ) : null}
              {projectedLines.map((x) => (
                <li key={x.id} className="group flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-ink-2">{EXPENSE_CATEGORY[x.category]} <span className="text-xs text-ink-4">{x.description}</span></span>
                  <span className="flex items-center gap-1 tabular">{formatMoney(x.amountCents)}<RemoveButton action={removeExpense.bind(null, x.id)} label="Remove" className="p-1 opacity-0 group-hover:opacity-100" /></span>
                </li>
              ))}
              {p.costs.filter((c) => c.category === "PLATFORM" || c.category === "PROCESSING").map((c) => (
                <li key={c.category} className="flex justify-between"><span className="text-ink-2">{c.label} <span className="text-xs text-ink-4">{e.platform?.name}</span></span><span className="tabular">{formatMoney(c.cents)}</span></li>
              ))}
              <li className="flex justify-between border-t border-line pt-2 font-medium"><span>Total</span><span className="tabular">{formatMoney(p.totalCostCents)}</span></li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Payments"
            description={<Badge tone={pay.tone} size="xs">{pay.label}</Badge>}
            action={
              <ActionDialog trigger={<><Plus className="h-3.5 w-3.5" />Record payment</>} triggerSize="sm" triggerVariant="primary" title="Record a payment" action={addPayment} hidden={{ eventId: e.id }}>
                <FormGrid>
                  <Field label="Type" name="kind">
                    <Select id="kind" name="kind" defaultValue={s.payment.depositOutstandingCents > 0 ? "DEPOSIT" : "BALANCE"}>
                      <option value="DEPOSIT">Deposit</option><option value="BALANCE">Balance</option><option value="TIP">Tip / gratuity</option><option value="OTHER">Other</option>
                    </Select>
                  </Field>
                  <Field label="Amount" name="amount"><MoneyInput id="amount" name="amount" required defaultValue={String((s.payment.depositOutstandingCents || s.payment.balanceCents) / 100)} /></Field>
                  <Field label="Received" name="receivedOn"><Input id="receivedOn" name="receivedOn" type="date" required defaultValue={today} /></Field>
                  <Field label="Method" name="method"><Input id="method" name="method" placeholder="Zelle, check, card…" list="pay-methods" /></Field>
                </FormGrid>
                <datalist id="pay-methods">{["Zelle", "Venmo", "Check", "Card", "Cash", "ACH", "Platform"].map((m) => <option key={m} value={m} />)}</datalist>
              </ActionDialog>
            }
          />
          <CardBody className="space-y-4">
            <div>
              <ProgressBar value={e.priceCents ? (s.payment.collectedCents / e.priceCents) * 100 : 0} className="h-2" />
              <div className="mt-2 flex justify-between text-sm">
                <span><strong className="font-medium tabular">{formatMoney(s.payment.collectedCents)}</strong> <span className="text-ink-3">of {formatMoney(e.priceCents)}</span></span>
                <span className={cn(s.payment.balanceCents > 0 && past ? "text-clay" : "text-ink-2")}><strong className="font-medium tabular">{formatMoney(s.payment.balanceCents)}</strong> remaining</span>
              </div>
              <div className="mt-1 text-xs text-ink-3">
                Deposit {formatMoney(e.depositCents)}{e.depositDueDate ? ` due ${formatDate.short(toISODate(e.depositDueDate))}` : ""}
                {e.balanceDueDate ? ` · balance due ${formatDate.short(toISODate(e.balanceDueDate))}` : ""}
                {s.payment.tipsCents ? ` · ${formatMoney(s.payment.tipsCents)} in tips` : ""}
              </div>
            </div>
            {e.payments.length > 0 && (
              <ul className="divide-y divide-line/70 border-t border-line/70">
                {e.payments.map((pm) => (
                  <li key={pm.id} className="group flex items-center justify-between py-2.5 text-sm">
                    <span><span className="font-medium">{pm.kind === "TIP" ? "Tip" : pm.kind[0] + pm.kind.slice(1).toLowerCase()}</span> <span className="text-ink-3">· {formatDate.medium(toISODate(pm.receivedOn))}{pm.method ? ` · ${pm.method}` : ""}</span>{historicalMonths.has(toISODate(pm.receivedOn).slice(0, 7)) && <span className="ml-1.5 text-xs text-ink-4" title="This month’s revenue comes from your historical entry, which already includes this payment.">· in historical total</span>}</span>
                    <span className="flex items-center gap-1 tabular">{formatMoney(pm.amountCents)}<RemoveButton action={removePayment.bind(null, pm.id)} label="Remove payment" className="p-1 opacity-0 group-hover:opacity-100" /></span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            eyebrow="After the event"
            title="Actual costs"
            action={<ExpenseDialog eventId={e.id} kind="ACTUAL" label="Receipt" />}
            description="Food comes from the Food cost card above (or Shopping-mode prices). Labor uses staff actual pay once shifts are marked worked."
          />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {foodLines.length > 0 && <li className="flex justify-between"><a href="#food-cost" className="text-ink-2 hover:text-wine">Food <span className="text-xs text-ink-4">{foodLines.length} purchase{foodLines.length === 1 ? "" : "s"}</span></a><span className="tabular">{formatMoney(foodLines.reduce((t, x) => t + x.amountCents, 0))}</span></li>}
              {otherActualLines.map((x) => (
                <li key={x.id} className="group flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-ink-2">{x.vendor ?? x.description} <span className="text-xs text-ink-4">{EXPENSE_CATEGORY[x.category]}</span></span>
                  <span className="flex items-center gap-1 tabular">{formatMoney(x.amountCents)}<RemoveButton action={removeExpense.bind(null, x.id)} label="Remove" className="p-1 opacity-0 group-hover:opacity-100" /></span>
                </li>
              ))}
              {actual.foodSource === "shopping" && <li className="flex justify-between"><span className="text-ink-2">Food <span className="text-xs text-ink-4">from shopping prices</span></span><span className="tabular">{formatMoney(shopping.totals.actualCents)}</span></li>}
              {actual.costs.filter((c) => c.category === "LABOR").map((c) => <li key="labor" className="flex justify-between"><span className="text-ink-2">Staff <span className="text-xs text-ink-4">{actual.laborSource === "projected" ? "scheduled — mark shifts worked for actuals" : "completed & paid"}</span></span><span className="tabular">{formatMoney(c.cents)}</span></li>)}
              {!hasActuals && <li className="text-ink-4">Nothing entered yet.</li>}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Analysis" title="Projected vs actual" description={!showActual ? "Fills in after the event, as you record receipts, shopping prices, staff pay and payments." : undefined} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs text-ink-3">
                <tr className="border-b border-line"><th className="py-2 text-left font-medium" /><th className="py-2 text-right font-medium">Projected</th><th className="py-2 text-right font-medium">Actual</th><th className="py-2 text-right font-medium">Difference</th></tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {compare.map(([label, proj, act, kind, higherIsGood]) => {
                  const diff = proj !== null && act !== null ? act - proj : null;
                  const good = diff === null || diff === 0 ? null : higherIsGood ? diff > 0 : diff < 0;
                  const fmt = (v: number | null) => (kind === "pct" ? formatPct(v, 1) : formatMoney(v));
                  return (
                    <tr key={label}>
                      <td className="py-3 font-medium">{label}</td>
                      <td className="py-3 text-right tabular text-ink-2">{fmt(proj)}</td>
                      <td className="py-3 text-right tabular">{showActual ? fmt(act) : "—"}</td>
                      <td className={cn("py-3 text-right tabular", good === true && "text-sage", good === false && "text-clay")}>
                        {showActual && diff !== null ? `${diff > 0 ? "+" : ""}${kind === "pct" ? `${diff.toFixed(1)} pts` : formatMoney(diff)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasActuals && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {actual.costs.map((c) => (
                <div key={c.category} className="rounded-xl bg-sand/50 px-3 py-2">
                  <div className="text-xs text-ink-3">{c.label}</div>
                  <div className="tabular">{formatMoney(c.cents)}</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
