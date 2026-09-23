/**
 * The money engine: labor, platform fees, profitability, payments.
 * Everything is integer cents in and out.
 */

import { hoursBetween, type ISODate, daysBetween } from "./dates";

// ─── Labor ──────────────────────────────────────────────────────────────────

export interface AssignmentInput {
  rateCents: number;
  rateType: "HOURLY" | "FLAT";
  callTime?: string | null;
  endTime?: string | null;
  actualPayCents?: number | null;
  staffMemberId?: string | null;
  status?: string;
}

/** Hourly roles without times are costed at a 5-hour default so labor is never silently $0. */
export const DEFAULT_SHIFT_HOURS = 5;

export function assignmentHours(a: AssignmentInput): number {
  return hoursBetween(a.callTime, a.endTime) ?? DEFAULT_SHIFT_HOURS;
}

export function assignmentCost(a: AssignmentInput): number {
  if (a.rateType === "FLAT") return a.rateCents;
  return Math.round(a.rateCents * assignmentHours(a));
}

/** Projected labor includes unfilled roles: you'll still have to pay someone. */
export function projectedLabor(assignments: AssignmentInput[]): number {
  return assignments.reduce((sum, a) => sum + assignmentCost(a), 0);
}

export function actualLabor(assignments: AssignmentInput[]): number {
  return assignments
    .filter((a) => a.staffMemberId && a.status !== "NEEDED")
    .reduce((sum, a) => sum + (a.actualPayCents ?? assignmentCost(a)), 0);
}

// ─── Platforms ──────────────────────────────────────────────────────────────

export interface PlatformFees {
  commissionPct: number;
  fixedFeeCents: number;
  processingPct: number;
  processingFixedCents: number;
}

export const NO_FEES: PlatformFees = { commissionPct: 0, fixedFeeCents: 0, processingPct: 0, processingFixedCents: 0 };

export function platformFees(priceCents: number, p: PlatformFees | null | undefined) {
  const f = p ?? NO_FEES;
  if (priceCents <= 0) return { commissionCents: 0, processingCents: 0, totalCents: 0, netCents: 0 };
  const commissionCents = Math.round((priceCents * f.commissionPct) / 100 + f.fixedFeeCents);
  const processingCents = Math.round((priceCents * f.processingPct) / 100 + f.processingFixedCents);
  const totalCents = commissionCents + processingCents;
  return { commissionCents, processingCents, totalCents, netCents: priceCents - totalCents };
}

/** The client-facing price needed for you to take home `netCents` after platform fees. */
export function priceForNet(netCents: number, p: PlatformFees | null | undefined): number {
  const f = p ?? NO_FEES;
  const pct = (f.commissionPct + f.processingPct) / 100;
  if (pct >= 1) return Infinity;
  // Round up to the next whole dollar so the net is never short.
  const raw = (netCents + f.fixedFeeCents + f.processingFixedCents) / (1 - pct);
  return Math.ceil(raw / 100) * 100;
}

// ─── Profitability ──────────────────────────────────────────────────────────

export type CostCategory =
  | "FOOD"
  | "BEVERAGE"
  | "LABOR"
  | "PREP_LABOR"
  | "TRAVEL"
  | "MILEAGE"
  | "RENTALS"
  | "EQUIPMENT"
  | "DISPOSABLES"
  | "OTHER"
  | "PLATFORM"
  | "PROCESSING";

export const COST_LABELS: Record<CostCategory, string> = {
  FOOD: "Food",
  BEVERAGE: "Beverage",
  LABOR: "Event labor",
  PREP_LABOR: "Shopping & prep labor",
  TRAVEL: "Travel",
  MILEAGE: "Mileage",
  RENTALS: "Rentals",
  EQUIPMENT: "Equipment",
  DISPOSABLES: "Disposables",
  OTHER: "Other",
  PLATFORM: "Platform commission",
  PROCESSING: "Payment processing",
};

export interface ExpenseInput {
  category: Exclude<CostCategory, "PLATFORM" | "PROCESSING">;
  amountCents: number;
}

export interface ProfitSettings {
  targetMarginPct: number;
  minimumMarginPct: number;
  mileageRateCents: number;
}

export interface ProjectionInput {
  priceCents: number;
  guestCount: number;
  foodCostCents: number;
  laborCents: number;
  roundTripMiles?: number | null;
  expenses: ExpenseInput[]; // projected lines entered by hand
  platform?: PlatformFees | null;
  settings: ProfitSettings;
}

export interface ProfitSummary {
  revenueCents: number;
  costs: { category: CostCategory; label: string; cents: number }[];
  totalCostCents: number;
  profitCents: number;
  marginPct: number | null;
  pricePerGuestCents: number | null;
  foodCostPerGuestCents: number | null;
  foodCostPct: number | null;
  laborCostPct: number | null;
}

function summarize(revenueCents: number, guestCount: number, raw: Map<CostCategory, number>): ProfitSummary {
  const costs = [...raw.entries()]
    .filter(([, cents]) => cents !== 0)
    .map(([category, cents]) => ({ category, label: COST_LABELS[category], cents: Math.round(cents) }));
  const totalCostCents = costs.reduce((s, c) => s + c.cents, 0);
  const profitCents = revenueCents - totalCostCents;
  const food = (raw.get("FOOD") ?? 0) + (raw.get("BEVERAGE") ?? 0);
  const labor = (raw.get("LABOR") ?? 0) + (raw.get("PREP_LABOR") ?? 0);
  return {
    revenueCents,
    costs,
    totalCostCents,
    profitCents,
    marginPct: revenueCents > 0 ? (profitCents / revenueCents) * 100 : null,
    pricePerGuestCents: guestCount > 0 ? Math.round(revenueCents / guestCount) : null,
    foodCostPerGuestCents: guestCount > 0 ? Math.round(food / guestCount) : null,
    foodCostPct: revenueCents > 0 ? (food / revenueCents) * 100 : null,
    laborCostPct: revenueCents > 0 ? (labor / revenueCents) * 100 : null,
  };
}

function addCost(map: Map<CostCategory, number>, cat: CostCategory, cents: number) {
  map.set(cat, (map.get(cat) ?? 0) + cents);
}

export function mileageCost(miles: number | null | undefined, rateCents: number): number {
  return miles && miles > 0 ? Math.round(miles * rateCents) : 0;
}

export function projectEvent(input: ProjectionInput): ProfitSummary & {
  recommendedPriceCents: number;
  minimumPriceCents: number;
  marginStatus: "healthy" | "below-target" | "below-minimum" | "unpriced";
} {
  const costs = new Map<CostCategory, number>();
  addCost(costs, "FOOD", input.foodCostCents);
  addCost(costs, "LABOR", input.laborCents);
  addCost(costs, "MILEAGE", mileageCost(input.roundTripMiles, input.settings.mileageRateCents));
  for (const e of input.expenses) addCost(costs, e.category, e.amountCents);

  const fixedCosts = [...costs.values()].reduce((s, c) => s + c, 0);
  const fees = platformFees(input.priceCents, input.platform);
  addCost(costs, "PLATFORM", fees.commissionCents);
  addCost(costs, "PROCESSING", fees.processingCents);

  const summary = summarize(input.priceCents, input.guestCount, costs);
  const recommendedPriceCents = priceForMargin(fixedCosts, input.settings.targetMarginPct, input.platform);
  const minimumPriceCents = priceForMargin(fixedCosts, input.settings.minimumMarginPct, input.platform);

  let marginStatus: "healthy" | "below-target" | "below-minimum" | "unpriced" = "healthy";
  if (input.priceCents <= 0 || summary.marginPct === null) marginStatus = "unpriced";
  else if (summary.marginPct < input.settings.minimumMarginPct) marginStatus = "below-minimum";
  else if (summary.marginPct < input.settings.targetMarginPct) marginStatus = "below-target";

  return { ...summary, recommendedPriceCents, minimumPriceCents, marginStatus };
}

/**
 * Price P such that (P − costs − fees(P)) / P = margin.
 * P = (costs + fixed fees) / (1 − fee% − margin), rounded up to the next $5.
 */
export function priceForMargin(fixedCostCents: number, marginPct: number, platform?: PlatformFees | null): number {
  const f = platform ?? NO_FEES;
  const denom = 1 - (f.commissionPct + f.processingPct) / 100 - marginPct / 100;
  if (denom <= 0) return Infinity;
  const raw = (fixedCostCents + f.fixedFeeCents + f.processingFixedCents) / denom;
  return Math.ceil(raw / 500) * 500;
}

// ─── Actuals ────────────────────────────────────────────────────────────────

export interface ActualInput {
  collectedCents: number; // payments received, excluding tips
  guestCount: number;
  actualExpenses: ExpenseInput[];
  /** Sum of actual prices entered in shopping mode, used when no FOOD receipts are entered. */
  shoppingActualCents: number;
  assignments: AssignmentInput[];
  platform?: PlatformFees | null;
}

export function actualEvent(input: ActualInput): ProfitSummary & { foodSource: "receipts" | "shopping" | "none" } {
  const costs = new Map<CostCategory, number>();
  const foodReceipts = input.actualExpenses.filter((e) => e.category === "FOOD");
  let foodSource: "receipts" | "shopping" | "none" = "none";
  if (foodReceipts.length) foodSource = "receipts";
  else if (input.shoppingActualCents > 0) {
    foodSource = "shopping";
    addCost(costs, "FOOD", input.shoppingActualCents);
  }
  for (const e of input.actualExpenses) addCost(costs, e.category, e.amountCents);
  addCost(costs, "LABOR", actualLabor(input.assignments));
  const fees = platformFees(input.collectedCents, input.platform);
  addCost(costs, "PLATFORM", fees.commissionCents);
  addCost(costs, "PROCESSING", fees.processingCents);
  return { ...summarize(input.collectedCents, input.guestCount, costs), foodSource };
}

// ─── Payments ───────────────────────────────────────────────────────────────

export type PaymentStatus = "DEPOSIT_DUE" | "DEPOSIT_PAID" | "BALANCE_DUE" | "PAID" | "NO_CHARGE";

export interface PaymentInput {
  kind: "DEPOSIT" | "BALANCE" | "TIP" | "OTHER";
  amountCents: number;
}

export function paymentSummary(
  event: { priceCents: number; depositCents: number; balanceDueDate?: ISODate | null; date: ISODate },
  payments: PaymentInput[],
  today: ISODate,
) {
  const collectedCents = payments.filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents, 0);
  const tipsCents = payments.filter((p) => p.kind === "TIP").reduce((s, p) => s + p.amountCents, 0);
  const balanceCents = Math.max(0, event.priceCents - collectedCents);
  const depositOutstandingCents = Math.max(0, event.depositCents - collectedCents);

  let status: PaymentStatus;
  if (event.priceCents <= 0) status = "NO_CHARGE";
  else if (balanceCents === 0) status = "PAID";
  else if (depositOutstandingCents > 0) status = "DEPOSIT_DUE";
  else {
    const due = event.balanceDueDate ?? event.date;
    status = daysBetween(today, due) <= 7 ? "BALANCE_DUE" : "DEPOSIT_PAID";
  }
  return { collectedCents, tipsCents, balanceCents, depositOutstandingCents, status };
}
