/**
 * Units of measure and conversion.
 *
 * Three families convert freely within themselves: mass, volume and count.
 * Crossing families needs ingredient knowledge:
 *   volume ↔ mass  via gramsPerMl  (density)
 *   count  ↔ mass  via gramsPerEach (an onion ≈ 250 g)
 * Any other unit ("bunch", "can", "sprig") only converts to itself.
 */

export type Dimension = "mass" | "volume" | "count" | "other";

interface UnitDef {
  code: string;
  label: string;
  plural?: string;
  dimension: Dimension;
  /** grams for mass, millilitres for volume, pieces for count */
  base: number;
}

const DEFS: UnitDef[] = [
  { code: "g", label: "g", dimension: "mass", base: 1 },
  { code: "kg", label: "kg", dimension: "mass", base: 1000 },
  { code: "oz", label: "oz", dimension: "mass", base: 28.349523125 },
  { code: "lb", label: "lb", dimension: "mass", base: 453.59237 },
  { code: "ml", label: "ml", dimension: "volume", base: 1 },
  { code: "l", label: "L", dimension: "volume", base: 1000 },
  { code: "tsp", label: "tsp", dimension: "volume", base: 4.92892159375 },
  { code: "tbsp", label: "tbsp", dimension: "volume", base: 14.78676478125 },
  { code: "floz", label: "fl oz", dimension: "volume", base: 29.5735295625 },
  { code: "cup", label: "cup", plural: "cups", dimension: "volume", base: 236.5882365 },
  { code: "pt", label: "pt", dimension: "volume", base: 473.176473 },
  { code: "qt", label: "qt", dimension: "volume", base: 946.352946 },
  { code: "gal", label: "gal", dimension: "volume", base: 3785.411784 },
  { code: "ea", label: "ea", dimension: "count", base: 1 },
  { code: "dozen", label: "dozen", dimension: "count", base: 12 },
];

const BY_CODE = new Map(DEFS.map((d) => [d.code, d]));

/** Units offered in pickers. Free-text "other" units are also allowed. */
export const COMMON_UNITS = DEFS.map((d) => d.code).concat([
  "bunch",
  "head",
  "clove",
  "sprig",
  "can",
  "bottle",
  "jar",
  "package",
  "case",
  "sheet",
  "pinch",
]);

export function normalizeUnit(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  const aliases: Record<string, string> = {
    gram: "g", grams: "g", kilogram: "kg", kilograms: "kg",
    ounce: "oz", ounces: "oz", pound: "lb", pounds: "lb", lbs: "lb",
    milliliter: "ml", milliliters: "ml", liter: "l", liters: "l", litre: "l",
    teaspoon: "tsp", teaspoons: "tsp", tablespoon: "tbsp", tablespoons: "tbsp", tbs: "tbsp",
    "fl oz": "floz", "fl. oz": "floz", cups: "cup", c: "cup",
    pint: "pt", pints: "pt", quart: "qt", quarts: "qt", gallon: "gal", gallons: "gal",
    each: "ea", pc: "ea", pcs: "ea", piece: "ea", pieces: "ea", whole: "ea",
    doz: "dozen", bunches: "bunch", heads: "head", cloves: "clove", sprigs: "sprig",
    cans: "can", bottles: "bottle", jars: "jar", packages: "package", pkg: "package",
    cases: "case", sheets: "sheet",
  };
  return aliases[u] ?? u;
}

export function dimensionOf(unit: string): Dimension {
  return BY_CODE.get(normalizeUnit(unit))?.dimension ?? "other";
}

export interface ConversionFacts {
  gramsPerMl?: number | null;
  gramsPerEach?: number | null;
}

/** Converts a quantity to grams / ml / pieces of its own family. */
function toBase(qty: number, unit: string): { value: number; dim: Dimension } | null {
  const def = BY_CODE.get(normalizeUnit(unit));
  if (!def) return null;
  return { value: qty * def.base, dim: def.dimension };
}

/**
 * Convert `qty` of `from` into `to`. Returns null when it can't be done honestly.
 * Callers must surface null as "needs conversion info" rather than guess.
 */
export function convert(
  qty: number,
  from: string,
  to: string,
  facts: ConversionFacts = {},
): number | null {
  const f = normalizeUnit(from);
  const t = normalizeUnit(to);
  if (f === t) return qty;

  const src = toBase(qty, f);
  const dst = BY_CODE.get(t);
  if (!src || !dst) return null;
  if (src.dim === dst.dimension) return src.value / dst.base;

  // Cross-family: go through grams.
  const grams = toGrams(src.value, src.dim, facts);
  if (grams === null) return null;
  const target = fromGrams(grams, dst.dimension, facts);
  if (target === null) return null;
  return target / dst.base;
}

function toGrams(value: number, dim: Dimension, facts: ConversionFacts): number | null {
  if (dim === "mass") return value;
  if (dim === "volume") return facts.gramsPerMl ? value * facts.gramsPerMl : null;
  if (dim === "count") return facts.gramsPerEach ? value * facts.gramsPerEach : null;
  return null;
}

function fromGrams(grams: number, dim: Dimension, facts: ConversionFacts): number | null {
  if (dim === "mass") return grams;
  if (dim === "volume") return facts.gramsPerMl ? grams / facts.gramsPerMl : null;
  if (dim === "count") return facts.gramsPerEach ? grams / facts.gramsPerEach : null;
  return null;
}

export function unitLabel(unit: string, qty = 1): string {
  const def = BY_CODE.get(normalizeUnit(unit));
  if (!def) return unit;
  return qty > 1 && def.plural ? def.plural : def.label;
}

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

/** Kitchen-friendly number: 1.5 → "1½", 0.33 → "⅓", 12.4 → "12.4", 125 → "125". */
export function formatNumber(n: number, useFractions = true): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 100) return Math.round(n).toLocaleString("en-US");
  if (useFractions && n < 20) {
    const whole = Math.floor(n);
    const frac = n - whole;
    if (frac < 0.04) return String(whole || (n > 0 ? formatDecimal(n) : "0"));
    if (frac > 0.96) return String(whole + 1);
    for (const [value, glyph] of FRACTIONS) {
      if (Math.abs(frac - value) < 0.04) return whole ? `${whole}${glyph}` : glyph;
    }
  }
  return formatDecimal(n);
}

function formatDecimal(n: number): string {
  const digits = n < 1 ? 2 : n < 10 ? 2 : 1;
  return Number(n.toFixed(digits)).toLocaleString("en-US");
}

const VOLUME_LADDER = ["tsp", "tbsp", "cup", "qt", "gal"];
const FRACTION_UNITS = new Set(["tsp", "tbsp", "cup", "qt", "gal", "lb", "oz", "ea", "dozen"]);

/**
 * Picks a readable unit for a scaled quantity: 48 tbsp → 3 cups, 40 oz → 2.5 lb.
 * Stays in the original family; never converts across families.
 */
export function humanize(qty: number, unit: string): { qty: number; unit: string } {
  const u = normalizeUnit(unit);
  const dim = dimensionOf(u);
  if (dim === "volume" && VOLUME_LADDER.includes(u)) {
    const ml = convert(qty, u, "ml")!;
    let best = u;
    for (const step of VOLUME_LADDER) {
      const v = convert(ml, "ml", step)!;
      // Use the largest unit that still reads as at least 1 (¼ cup is fine too).
      if (v >= 1 || (step === "cup" && v >= 0.25)) best = step;
    }
    return { qty: convert(ml, "ml", best)!, unit: best };
  }
  if (dim === "volume" && (u === "ml" || u === "l")) {
    const ml = convert(qty, u, "ml")!;
    return ml >= 1000 ? { qty: ml / 1000, unit: "l" } : { qty: ml, unit: "ml" };
  }
  if (dim === "mass" && (u === "oz" || u === "lb")) {
    const oz = convert(qty, u, "oz")!;
    return oz >= 16 ? { qty: oz / 16, unit: "lb" } : { qty: oz, unit: "oz" };
  }
  if (dim === "mass" && (u === "g" || u === "kg")) {
    const g = convert(qty, u, "g")!;
    return g >= 1000 ? { qty: g / 1000, unit: "kg" } : { qty: g, unit: "g" };
  }
  return { qty, unit: u };
}

export function formatQuantity(qty: number, unit: string, opts: { humanize?: boolean } = {}): string {
  const h = opts.humanize === false ? { qty, unit: normalizeUnit(unit) } : humanize(qty, unit);
  const num = formatNumber(h.qty, FRACTION_UNITS.has(h.unit));
  return `${num} ${unitLabel(h.unit, h.qty)}`;
}
