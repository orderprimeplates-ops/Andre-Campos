import { describe, expect, it } from "vitest";
import { convert, formatNumber, formatQuantity, humanize, normalizeUnit } from "../units";

describe("convert", () => {
  it("converts within a family", () => {
    expect(convert(16, "oz", "lb")).toBeCloseTo(1, 6);
    expect(convert(3, "tsp", "tbsp")).toBeCloseTo(1, 6);
    expect(convert(4, "cup", "qt")).toBeCloseTo(1, 6);
    expect(convert(1, "gal", "qt")).toBeCloseTo(4, 6);
    expect(convert(2, "dozen", "ea")).toBe(24);
  });

  it("normalizes aliases", () => {
    expect(normalizeUnit("Tablespoons")).toBe("tbsp");
    expect(normalizeUnit("lbs")).toBe("lb");
    expect(convert(1, "pound", "ounces")).toBeCloseTo(16, 6);
  });

  it("crosses families only with ingredient facts", () => {
    expect(convert(1, "cup", "lb")).toBeNull();
    // butter ≈ 0.911 g/ml → 1 cup ≈ 215.5 g ≈ 0.475 lb
    expect(convert(1, "cup", "lb", { gramsPerMl: 0.911 })).toBeCloseTo(0.4752, 3);
    // 2 onions at 250 g each ≈ 1.10 lb
    expect(convert(2, "ea", "lb", { gramsPerEach: 250 })).toBeCloseTo(1.1023, 3);
  });

  it("refuses to convert unknown units to other units", () => {
    expect(convert(1, "bunch", "oz")).toBeNull();
    expect(convert(3, "bunch", "bunch")).toBe(3);
  });
});

describe("formatting", () => {
  it("uses kitchen fractions", () => {
    expect(formatNumber(1.5)).toBe("1½");
    expect(formatNumber(0.25)).toBe("¼");
    expect(formatNumber(2.333)).toBe("2⅓");
    expect(formatNumber(150.4)).toBe("150");
  });

  it("humanizes scaled volumes and weights", () => {
    expect(humanize(48, "tbsp")).toMatchObject({ unit: "cup" });
    expect(humanize(48, "tbsp").qty).toBeCloseTo(3, 6);
    expect(humanize(40, "oz")).toMatchObject({ unit: "lb", qty: 2.5 });
    expect(formatQuantity(6, "tsp")).toBe("2 tbsp");
  });
});
