"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, ChevronDown, Eye, EyeOff, MoreHorizontal, Plus, Repeat, SearchX, Store, Tags, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney, centsToInput } from "@/lib/domain/money";
import { INGREDIENT_CATEGORY, SHOPPING_STATUS } from "@/lib/status";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, MoneyInput, Select } from "@/components/ui/field";
import { ProgressBar } from "@/components/ui/misc";
import { addShopExtra, removeShopExtra, setShopStatus, updateShopItem } from "@/app/(app)/events/actions/shopping";
import type { ShopRow } from "@/lib/server/shopping";
import type { ShoppingStatus } from "@/generated/prisma/enums";

type Group = "category" | "store";

export function ShoppingList({
  eventId, rows, vendors, totals, mode = "full",
}: {
  eventId: string;
  rows: ShopRow[];
  vendors: { id: string; name: string }[];
  totals: { items: number; done: number; pantry: number; estimatedCents: number; actualCents: number; notFound: number };
  mode?: "full" | "shop";
}) {
  const [group, setGroup] = useState<Group>(mode === "shop" ? "store" : "category");
  const [hideDone, setHideDone] = useState(false);
  const [editing, setEditing] = useState<ShopRow | null>(null);
  const [, start] = useTransition();
  const [list, setOptimistic] = useOptimistic(rows, (state, { key, status }: { key: string; status: ShopRow["status"] }) =>
    state.map((r) => (r.key === key ? { ...r, status } : r)),
  );
  const shop = mode === "shop";

  const toggle = (r: ShopRow) => {
    const next: ShoppingStatus = r.status === "PENDING" ? "PURCHASED" : "PENDING";
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
    start(async () => {
      setOptimistic({ key: r.key, status: next });
      await setShopStatus(eventId, r.key, next);
    });
  };

  const buyRows = list.filter((r) => !r.isPantry);
  const pantryRows = list.filter((r) => r.isPantry);
  const done = buyRows.filter((r) => r.status !== "PENDING").length;
  const visible = buyRows.filter((r) => !hideDone || r.status === "PENDING");
  const groupKey = (r: ShopRow) => (group === "store" ? r.vendorName : INGREDIENT_CATEGORY[r.category] ?? r.category);
  const groups = [...new Set(visible.map(groupKey))];
  if (group === "store") groups.sort((a, b) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : 0));

  return (
    <div>
      <div className={cn("mb-5 rounded-[var(--radius-card)] border border-line/70 bg-linen p-4 shadow-[var(--shadow-card)] sm:p-5", shop && "sticky top-[4.25rem] z-20 lg:top-4")}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="font-display text-[2rem] leading-none tabular">{done}<span className="text-ink-4">/{buyRows.length}</span></div>
            <div className="mt-1 text-xs text-ink-3">in the cart{totals.notFound ? ` · ${totals.notFound} not found` : ""}</div>
          </div>
          <div className="text-right text-sm">
            <div className="tabular"><span className="text-ink-3">Est.</span> {formatMoney(totals.estimatedCents)}</div>
            <div className="tabular"><span className="text-ink-3">Spent</span> <span className="font-medium">{formatMoney(totals.actualCents)}</span></div>
          </div>
        </div>
        <ProgressBar value={buyRows.length ? (done / buyRows.length) * 100 : 0} className="mt-3 h-2" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-sand/60 p-0.5">
            {([["category", "Aisle", Tags], ["store", "Store", Store]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setGroup(k)} className={cn("flex items-center gap-1.5 rounded-[0.6rem] px-3 py-1.5 text-[0.8125rem] font-medium", group === k ? "bg-linen text-ink shadow-sm" : "text-ink-3")}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setHideDone((h) => !h)} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[0.8125rem] font-medium text-ink-3 hover:bg-sand">
            {hideDone ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{hideDone ? "Show all" : "Hide done"}
          </button>
          <div className="ml-auto">
            <ActionDialog trigger={<><Plus className="h-3.5 w-3.5" />Add item</>} triggerSize="sm" triggerVariant="quiet" title="Add to the list" description="Ice, disposables, flowers — anything not from a recipe." action={addShopExtra} hidden={{ eventId }}>
              <Field label="Item" name="name"><Input id="name" name="name" required placeholder="Ice" /></Field>
              <FormGrid>
                <Field label="Quantity" name="quantity"><Input id="quantity" name="quantity" placeholder="2 × 20 lb bags" /></Field>
                <Field label="Estimated cost" name="estimated"><MoneyInput id="estimated" name="estimated" /></Field>
                <Field label="Category" name="category">
                  <Select id="category" name="category" defaultValue="OTHER">{Object.entries(INGREDIENT_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                </Field>
                <Field label="Store" name="vendorId">
                  <Select id="vendorId" name="vendorId" defaultValue=""><option value="">Unassigned</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
                </Field>
              </FormGrid>
            </ActionDialog>
          </div>
        </div>
      </div>

      {buyRows.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line-strong/60 px-6 py-10 text-center text-sm text-ink-3">
          Nothing to buy yet — add dishes with linked recipes to the menu and the list builds itself.
        </p>
      )}

      <div className="space-y-5">
        {groups.map((g) => {
          const items = visible.filter((r) => groupKey(r) === g);
          const left = items.filter((r) => r.status === "PENDING").length;
          return (
            <section key={g}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="eyebrow text-ink-2">{g}</h3>
                <span className="text-xs text-ink-4">{left ? `${left} left` : "done"}</span>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-line/70 bg-linen">
                {items.map((r) => (
                  <Row key={r.key} r={r} shop={shop} onToggle={() => toggle(r)} onMore={() => setEditing(r)} showStore={group === "category"} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {pantryRows.length > 0 && (
        <details className="group mt-6 rounded-2xl border border-line/70 bg-sand/40">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5">
            <span><span className="font-medium text-ink">Check the pantry</span> <span className="text-sm text-ink-3">· {pantryRows.length} staples used</span></span>
            <ChevronDown className="h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="border-t border-line/70">
            {pantryRows.map((r) => <Row key={r.key} r={r} shop={shop} onToggle={() => toggle(r)} onMore={() => setEditing(r)} showStore={false} pantry />)}
          </ul>
        </details>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? ""} description={editing?.buy ? `List says: ${editing.buy}` : undefined}>
        {editing && (
          <ActionForm action={updateShopItem} hidden={{ eventId, key: editing.key }} onCancel={() => setEditing(null)} onSuccess={() => setEditing(null)}>
            <div className="grid grid-cols-2 gap-2">
              {(["PURCHASED", "NOT_FOUND", "SUBSTITUTED", "PENDING"] as const).map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="radio" name="status" value={s} defaultChecked={editing.status === s} className="peer sr-only" />
                  <span className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-3 text-sm font-medium text-ink-2 peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-linen">
                    {s === "PURCHASED" ? <Check className="h-4 w-4" /> : s === "NOT_FOUND" ? <SearchX className="h-4 w-4" /> : s === "SUBSTITUTED" ? <Repeat className="h-4 w-4" /> : null}
                    {SHOPPING_STATUS[s].label}
                  </span>
                </label>
              ))}
            </div>
            {editing.kind === "ingredient" ? (
              <>
                <Field label="Substitution" name="substitution" hint="what you bought instead"><Input id="substitution" name="substitution" defaultValue={editing.substitution ?? ""} /></Field>
                <FormGrid>
                  <Field label={`Quantity${editing.unit ? ` (${editing.unit})` : ""}`} name="quantityOverride" hint="override"><Input id="quantityOverride" name="quantityOverride" inputMode="decimal" defaultValue={editing.quantityOverride ?? ""} /></Field>
                  <Field label="Actual price" name="actualPrice"><MoneyInput id="actualPrice" name="actualPrice" defaultValue={centsToInput(editing.actualPriceCents)} autoFocus /></Field>
                </FormGrid>
              </>
            ) : (
              <FormGrid>
                <Field label="Quantity" name="quantityText"><Input id="quantityText" name="quantityText" defaultValue={editing.buy} /></Field>
                <Field label="Actual price" name="actualPrice"><MoneyInput id="actualPrice" name="actualPrice" defaultValue={centsToInput(editing.actualPriceCents)} /></Field>
              </FormGrid>
            )}
            <FormGrid>
              <Field label="Store" name="vendorId">
                <Select id="vendorId" name="vendorId" defaultValue={editing.vendorId ?? ""}><option value="">Unassigned</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>
              </Field>
              <Field label="Note" name="notes"><Input id="notes" name="notes" defaultValue={editing.notes ?? ""} /></Field>
            </FormGrid>
            {editing.kind === "extra" && (
              <button type="button" className="text-sm text-clay hover:underline" onClick={() => { start(() => removeShopExtra(editing.id)); setEditing(null); }}>Remove this item</button>
            )}
          </ActionForm>
        )}
      </Dialog>
    </div>
  );
}

function Row({ r, shop, onToggle, onMore, showStore, pantry }: { r: ShopRow; shop: boolean; onToggle: () => void; onMore: () => void; showStore: boolean; pantry?: boolean }) {
  const done = r.status !== "PENDING";
  const st = SHOPPING_STATUS[r.status];
  return (
    <li className={cn("flex items-center gap-3 border-b border-line/60 last:border-0", shop ? "px-3 py-1" : "px-4 py-1")}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={`${done ? "Unmark" : "Mark"} ${r.name}`}
        className={cn("flex min-w-0 flex-1 items-center gap-3.5 text-left", shop ? "py-3" : "py-2.5")}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
            shop ? "h-9 w-9" : "h-6 w-6",
            r.status === "PURCHASED" ? "border-sage bg-sage text-linen" : r.status === "NOT_FOUND" ? "border-clay bg-clay-soft text-clay" : r.status === "SUBSTITUTED" ? "border-amber bg-amber-soft text-amber" : "border-line-strong bg-white",
          )}
        >
          {r.status === "PURCHASED" && <Check className={shop ? "h-5 w-5" : "h-3.5 w-3.5"} strokeWidth={3} />}
          {r.status === "NOT_FOUND" && <SearchX className={shop ? "h-4 w-4" : "h-3 w-3"} />}
          {r.status === "SUBSTITUTED" && <Repeat className={shop ? "h-4 w-4" : "h-3 w-3"} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block font-medium transition-colors", shop ? "text-[1.0625rem] leading-snug" : "truncate text-[0.9375rem]", done ? "text-ink-4 line-through decoration-ink-4/50" : "text-ink")}>{r.name}</span>
          <span className="block truncate text-xs text-ink-3">
            {pantry ? `uses ${r.need ?? "a little"}` : r.need && r.need !== r.buy ? `need ${r.need}` : null}
            {!pantry && r.usedIn.length > 0 && !shop && <>{r.need && r.need !== r.buy ? " · " : ""}{r.usedIn.slice(0, 2).join(", ")}{r.usedIn.length > 2 ? ` +${r.usedIn.length - 2}` : ""}</>}
            {showStore && !shop && r.vendorName !== "Unassigned" && ` · ${r.vendorName}`}
            {r.substitution && <span className="text-amber"> · sub: {r.substitution}</span>}
            {r.status !== "PENDING" && r.status !== "PURCHASED" && !r.substitution && <span className={r.status === "NOT_FOUND" ? "text-clay" : "text-amber"}> · {st.label}</span>}
          </span>
          {r.warning && <span className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-amber"><TriangleAlert className="h-3 w-3" />{r.warning}</span>}
          {r.scalingNotes.length > 0 && !shop && <span className="mt-0.5 block text-[0.6875rem] italic text-ink-3">{r.scalingNotes[0]}</span>}
        </span>
        {!pantry && (
          <span className={cn("shrink-0 text-right tabular", shop ? "max-w-[40%] text-[0.9375rem] font-semibold text-ink" : "text-sm font-medium text-ink-2", done && "text-ink-4")}>
            {r.buy}
            {r.actualPriceCents != null ? <span className="block text-xs font-normal text-sage">{formatMoney(r.actualPriceCents)}</span> : !shop && r.estimatedCents ? <span className="block text-xs font-normal text-ink-4">~{formatMoney(r.estimatedCents)}</span> : null}
          </span>
        )}
      </button>
      <button type="button" onClick={onMore} className={cn("shrink-0 rounded-full text-ink-3 hover:bg-sand hover:text-ink", shop ? "p-3" : "p-2")} aria-label={`More options for ${r.name}`}>
        <MoreHorizontal className="h-5 w-5" />
      </button>
    </li>
  );
}
