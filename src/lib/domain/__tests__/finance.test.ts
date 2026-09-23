import { describe, expect, it } from "vitest";
import {
  actualEvent,
  assignmentCost,
  paymentSummary,
  platformFees,
  priceForMargin,
  priceForNet,
  projectEvent,
  projectedLabor,
} from "../finance";

const settings = { targetMarginPct: 45, minimumMarginPct: 35, mileageRateCents: 70 };
const gigsalad = { commissionPct: 5, fixedFeeCents: 0, processingPct: 3, processingFixedCents: 30 };

describe("labor", () => {
  it("costs hourly shifts including past midnight and flat rates", () => {
    expect(assignmentCost({ rateCents: 3000, rateType: "HOURLY", callTime: "15:00", endTime: "22:30" })).toBe(22500);
    expect(assignmentCost({ rateCents: 3000, rateType: "HOURLY", callTime: "20:00", endTime: "01:00" })).toBe(15000);
    expect(assignmentCost({ rateCents: 25000, rateType: "FLAT" })).toBe(25000);
  });

  it("includes unfilled roles in projected labor", () => {
    expect(projectedLabor([
      { rateCents: 3000, rateType: "HOURLY", callTime: "16:00", endTime: "21:00", staffMemberId: null, status: "NEEDED" },
    ])).toBe(15000);
  });
});

describe("platform fees", () => {
  it("calculates commission and processing", () => {
    const f = platformFees(100000, gigsalad);
    expect(f.commissionCents).toBe(5000);
    expect(f.processingCents).toBe(3030);
    expect(f.netCents).toBe(91970);
  });

  it("grosses up a price to hit a target net", () => {
    const price = priceForNet(150000, gigsalad);
    expect(platformFees(price, gigsalad).netCents).toBeGreaterThanOrEqual(150000);
    expect(platformFees(price - 100, gigsalad).netCents).toBeLessThan(150000);
  });
});

describe("profitability", () => {
  const base = {
    guestCount: 10, foodCostCents: 45000, laborCents: 30000, roundTripMiles: 50,
    expenses: [{ category: "DISPOSABLES" as const, amountCents: 5000 }], settings,
  };

  it("summarizes revenue, costs, profit and margin", () => {
    const p = projectEvent({ ...base, priceCents: 180000, platform: null });
    // costs: 45000 + 30000 + 3500 mileage + 5000 = 83500
    expect(p.totalCostCents).toBe(83500);
    expect(p.profitCents).toBe(96500);
    expect(p.marginPct).toBeCloseTo(53.61, 1);
    expect(p.pricePerGuestCents).toBe(18000);
    expect(p.foodCostPerGuestCents).toBe(4500);
    expect(p.marginStatus).toBe("healthy");
  });

  it("flags a low margin without blocking", () => {
    const p = projectEvent({ ...base, priceCents: 110000, platform: gigsalad });
    expect(p.marginStatus).toBe("below-minimum");
    expect(p.costs.find((c) => c.category === "PLATFORM")?.cents).toBe(5500);
  });

  it("recommends prices that actually achieve the configured margins", () => {
    const p = projectEvent({ ...base, priceCents: 100000, platform: gigsalad });
    const atRecommended = projectEvent({ ...base, priceCents: p.recommendedPriceCents, platform: gigsalad });
    expect(atRecommended.marginPct!).toBeGreaterThanOrEqual(45);
    const atMinimum = projectEvent({ ...base, priceCents: p.minimumPriceCents, platform: gigsalad });
    expect(atMinimum.marginPct!).toBeGreaterThanOrEqual(35);
    expect(atMinimum.marginPct!).toBeLessThan(36);
    expect(priceForMargin(10000, 100)).toBe(Infinity);
  });

  it("uses receipts for actual food cost when present, otherwise shopping prices", () => {
    const withReceipts = actualEvent({
      collectedCents: 180000, guestCount: 10, shoppingActualCents: 40000, platform: null,
      assignments: [{ rateCents: 60000, rateType: "FLAT", staffMemberId: "s1", status: "PAID", actualPayCents: 60000 }],
      actualExpenses: [
        { category: "FOOD", amountCents: 28400 }, { category: "FOOD", amountCents: 16300 },
        { category: "TRAVEL", amountCents: 4700 }, { category: "RENTALS", amountCents: 17500 },
      ],
    });
    expect(withReceipts.foodSource).toBe("receipts");
    expect(withReceipts.totalCostCents).toBe(28400 + 16300 + 4700 + 17500 + 60000);

    const fromShopping = actualEvent({
      collectedCents: 180000, guestCount: 10, shoppingActualCents: 40000, platform: null, assignments: [], actualExpenses: [],
    });
    expect(fromShopping.foodSource).toBe("shopping");
    expect(fromShopping.totalCostCents).toBe(40000);
  });
});

describe("payments", () => {
  const ev = { priceCents: 200000, depositCents: 100000, date: "2026-10-20", balanceDueDate: "2026-10-13" };
  it("moves through deposit → balance → paid", () => {
    expect(paymentSummary(ev, [], "2026-09-01").status).toBe("DEPOSIT_DUE");
    const dep = [{ kind: "DEPOSIT" as const, amountCents: 100000 }];
    expect(paymentSummary(ev, dep, "2026-09-01").status).toBe("DEPOSIT_PAID");
    expect(paymentSummary(ev, dep, "2026-10-10").status).toBe("BALANCE_DUE");
    const all = [...dep, { kind: "BALANCE" as const, amountCents: 100000 }, { kind: "TIP" as const, amountCents: 20000 }];
    const s = paymentSummary(ev, all, "2026-10-10");
    expect(s.status).toBe("PAID");
    expect(s.tipsCents).toBe(20000);
    expect(s.balanceCents).toBe(0);
  });
});

describe("actual labor", () => {
  it("counts only completed, paid, or explicitly paid shifts", () => {
    const shift = { rateCents: 3000, rateType: "HOURLY" as const, callTime: "16:00", endTime: "21:00", staffMemberId: "s" };
    const r = actualEvent({
      collectedCents: 0, guestCount: 1, actualExpenses: [], shoppingActualCents: 0, platform: null,
      assignments: [{ ...shift, status: "CONFIRMED" }, { ...shift, status: "COMPLETED" }, { ...shift, status: "INVITED", actualPayCents: 5000 }],
    });
    expect(r.totalCostCents).toBe(15000 + 5000);
  });
});
