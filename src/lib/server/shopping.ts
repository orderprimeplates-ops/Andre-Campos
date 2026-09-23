import "server-only";
import { db } from "./db";
import { menuInclude, toMenuInput } from "@/lib/mappers";
import { buildShoppingList } from "@/lib/domain/culinary";
import { INGREDIENT_CATEGORY_ORDER } from "@/lib/status";
import { formatNumber, formatQuantity, unitLabel } from "@/lib/domain/units";

export interface ShopRow {
  key: string; // ingredientId or "x:<extraId>"
  kind: "ingredient" | "extra";
  id: string;
  name: string;
  category: string;
  vendorId: string | null;
  vendorName: string;
  /** What to put in the cart, e.g. "2 × 3 lb bag" or "4¼ lb" */
  buy: string;
  /** What the recipes actually use, e.g. "5.6 lb" */
  need: string | null;
  estimatedCents: number;
  actualPriceCents: number | null;
  status: "PENDING" | "PURCHASED" | "NOT_FOUND" | "SUBSTITUTED";
  substitution: string | null;
  quantityOverride: number | null;
  unit: string | null;
  notes: string | null;
  usedIn: string[];
  scalingNotes: string[];
  warning: string | null;
  isPantry: boolean;
}

export async function getEventShopping(eventId: string) {
  const event = await db.event.findUniqueOrThrow({
    where: { id: eventId },
    select: {
      id: true, name: true, guestCount: true, date: true, shoppingDate: true,
      menu: { include: menuInclude },
      shoppingStates: true,
      shoppingExtras: { include: { vendor: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const vendors = await db.vendor.findMany({ orderBy: { sortOrder: "asc" } });
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const states = new Map(event.shoppingStates.map((s) => [s.ingredientId, s]));
  const lines = buildShoppingList(toMenuInput(event.menu), event.guestCount);

  const rows: ShopRow[] = lines.map((l) => {
    const st = states.get(l.ingredient.id);
    const vendorId = st?.vendorId ?? l.ingredient.preferredVendorId ?? null;
    const qty = st?.quantityOverride ?? l.packages;
    const ing = l.ingredient;
    const buy = l.soldByUnit
      ? formatQuantity(qty, l.unit, { humanize: false })
      : `${formatNumber(qty)} × ${ing.purchaseUnit ?? unitLabel(ing.packageUnit)}`;
    const estimated = st?.quantityOverride != null ? Math.round(st.quantityOverride * ing.packagePriceCents) : l.purchaseCostCents;
    return {
      key: ing.id, kind: "ingredient", id: ing.id, name: ing.name, category: ing.category,
      vendorId, vendorName: vendorId ? vendorName.get(vendorId) ?? "Other" : "Unassigned",
      buy, need: l.neededQty > 0 ? formatQuantity(l.neededQty, l.unit) : null,
      estimatedCents: l.isPantryStaple ? 0 : estimated,
      actualPriceCents: st?.actualPriceCents ?? null, status: st?.status ?? "PENDING", substitution: st?.substitution ?? null,
      quantityOverride: st?.quantityOverride ?? null, unit: l.soldByUnit ? l.unit : ing.purchaseUnit ?? null, notes: st?.notes ?? null,
      usedIn: l.usedIn, scalingNotes: [...new Set(l.scalingNotes)],
      warning: l.unconverted.length ? `Can’t convert ${l.unconverted.map((u) => u.unit).join(", ")} — check quantity by hand` : null,
      isPantry: l.isPantryStaple,
    };
  });
  const extras: ShopRow[] = event.shoppingExtras.map((x) => ({
    key: `x:${x.id}`, kind: "extra", id: x.id, name: x.name, category: x.category, vendorId: x.vendorId,
    vendorName: x.vendor?.name ?? "Unassigned", buy: x.quantity ?? "", need: null, estimatedCents: x.estimatedCents ?? 0,
    actualPriceCents: x.actualPriceCents, status: x.status, substitution: null, quantityOverride: null, unit: null, notes: x.notes,
    usedIn: [], scalingNotes: [], warning: null, isPantry: false,
  }));
  const all = [...rows, ...extras].sort(
    (a, b) => INGREDIENT_CATEGORY_ORDER.indexOf(a.category) - INGREDIENT_CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name),
  );
  const toBuy = all.filter((r) => !r.isPantry);
  const done = toBuy.filter((r) => r.status !== "PENDING");
  return {
    event,
    vendors,
    rows: all,
    totals: {
      items: toBuy.length,
      done: done.length,
      pantry: all.length - toBuy.length,
      estimatedCents: toBuy.reduce((s, r) => s + r.estimatedCents, 0),
      actualCents: all.reduce((s, r) => s + (r.actualPriceCents ?? 0), 0),
      notFound: all.filter((r) => r.status === "NOT_FOUND").length,
    },
  };
}
