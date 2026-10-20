import { describe, expect, it } from "vitest";
import { actualEvent, ownerCosts, paymentSummary, projectEvent, salesTaxPortion } from "../finance";

const settings = { targetMarginPct: 45, minimumMarginPct: 35, mileageRateCents: 70 };

describe("sales tax inside payments", () => {
  const ev = { priceCents: 100000, depositCents: 50000, salesTaxCents: 7000, date: "2026-11-20" };
  it("keeps sales tax out of revenue and in the amount the client owes", () => {
    const s = paymentSummary(ev, [{ kind: "DEPOSIT", amountCents: 53500, salesTaxCents: 3500 }], "2026-10-20");
    expect(s.collectedCents).toBe(53500);
    expect(s.revenueCents).toBe(50000);
    expect(s.salesTaxCollectedCents).toBe(3500);
    expect(s.balanceCents).toBe(107000 - 53500);
    const paid = paymentSummary(ev, [{ kind: "DEPOSIT", amountCents: 53500, salesTaxCents: 3500 }, { kind: "BALANCE", amountCents: 53500, salesTaxCents: 3500 }], "2026-10-20");
    expect(paid).toMatchObject({ status: "PAID", balanceCents: 0, revenueCents: 100000 });
  });
  it("is unchanged for existing events and payments with no sales tax", () => {
    const s = paymentSummary({ priceCents: 200000, depositCents: 100000, date: "2026-11-20" }, [{ kind: "DEPOSIT", amountCents: 100000 }], "2026-10-20");
    expect(s).toMatchObject({ collectedCents: 100000, revenueCents: 100000, balanceCents: 100000 });
  });
  it("splits a payment's tax share in proportion to the booking", () => {
    expect(salesTaxPortion(53500, { priceCents: 100000, salesTaxCents: 7000 })).toBe(3500);
    expect(salesTaxPortion(50000, { priceCents: 100000 })).toBe(0);
  });
});

describe("event contribution profit", () => {
  const base = { collectedCents: 300000, priceCents: 300000, guestCount: 20, shoppingActualCents: 0, platform: null };
  const shift = { rateCents: 30000, rateType: "FLAT" as const, staffMemberId: "s1", status: "PAID", actualPayCents: 30000 };

  it("never counts staff twice when labor is also entered as an expense", () => {
    const both = actualEvent({ ...base, assignments: [shift], actualExpenses: [{ category: "LABOR", amountCents: 30000 }] });
    expect(both.costs.find((c) => c.category === "LABOR")?.cents).toBe(30000);
    const shiftsOnly = actualEvent({ ...base, assignments: [shift], actualExpenses: [] });
    expect(shiftsOnly.costs.find((c) => c.category === "LABOR")?.cents).toBe(30000);
  });

  it("adds owner time and overhead only when set", () => {
    expect(ownerCosts(6, {})).toEqual({ ownerLaborCents: 0, overheadCents: 0 });
    const c = ownerCosts(6, { ownerHourlyRateCents: 5000, overheadPerEventCents: 7500 });
    expect(c).toEqual({ ownerLaborCents: 30000, overheadCents: 7500 });
    const a = actualEvent({ ...base, assignments: [], actualExpenses: [], ...c });
    expect(a.profitCents).toBe(300000 - 30000 - 7500);
    const p = projectEvent({ priceCents: 300000, guestCount: 20, foodCostCents: 0, laborCents: 0, ownerHours: 6, expenses: [], settings: { ...settings, ownerHourlyRateCents: 5000, overheadPerEventCents: 7500 } });
    expect(p.profitCents).toBe(300000 - 37500);
    const unchanged = projectEvent({ priceCents: 300000, guestCount: 20, foodCostCents: 0, laborCents: 0, ownerHours: 6, expenses: [], settings });
    expect(unchanged.profitCents).toBe(300000);
  });

  it("counts general categories entered against an event", () => {
    const a = actualEvent({ ...base, assignments: [], actualExpenses: [{ category: "KITCHEN_RENTAL", amountCents: 20000 }, { category: "FOOD", amountCents: 50000 }] });
    expect(a.totalCostCents).toBe(70000);
  });
});
