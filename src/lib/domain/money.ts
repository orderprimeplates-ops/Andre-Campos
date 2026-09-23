/** All money is integer cents. */

export function formatMoney(cents: number | null | undefined, opts: { exact?: boolean } = {}): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const dollars = cents / 100;
  const showCents = opts.exact || (Math.abs(dollars) < 100 && cents % 100 !== 0);
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

/** $12.4k style for compact tiles. */
export function formatMoneyCompact(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 10_000) return `$${(dollars / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return formatMoney(cents);
}

export function formatPct(pct: number | null | undefined, digits = 0): string {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return "—";
  return `${pct.toFixed(digits)}%`;
}

/** "1,234.50" or "$1,234.50" → 123450. Returns null for blank/invalid input. */
export function parseMoney(input: string | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}
