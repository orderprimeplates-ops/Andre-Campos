import { formatMoney, formatPct } from "@/lib/domain/money";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

export interface EventProfitView {
  basis: "actual" | "mixed" | "estimated";
  revenueCents: number;
  costs: { label: string; cents: number }[];
  totalCostCents: number;
  profitCents: number;
  marginPct: number | null;
  /** Parts still estimated in an otherwise actual result, e.g. "food (menu estimate)". */
  estimatedParts: string[];
}

const BADGE = {
  actual: { label: "Actual", cls: "bg-sage-soft text-sage" },
  mixed: { label: "Actual + estimated", cls: "bg-champagne-soft text-[#8a6a35]" },
  estimated: { label: "Estimated", cls: "bg-amber-soft text-amber" },
};

/** Revenue | Costs | Contribution profit | Margin — the one-glance answer for an event. */
export function EventProfit({ v }: { v: EventProfitView }) {
  const b = BADGE[v.basis];
  const tiles: [string, string, string?][] = [
    ["Revenue", formatMoney(v.revenueCents), "excl. sales tax & tips"],
    ["Costs", formatMoney(v.totalCostCents), `${v.costs.length} item${v.costs.length === 1 ? "" : "s"}`],
    ["Contribution profit", formatMoney(v.profitCents)],
    ["Margin", formatPct(v.marginPct, 1)],
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-[1.45rem] leading-tight">Event profit</h2>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", b.cls)}>{b.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([k, val, note]) => (
          <div key={k}>
            <div className="text-[0.8125rem] text-ink-3">{k}</div>
            <div className={cn("mt-1 font-display text-[1.75rem] leading-none tabular sm:text-[2rem]", k === "Contribution profit" && v.profitCents < 0 && "text-clay")}>{val}</div>
            {note && <div className="mt-1 text-xs text-ink-4">{note}</div>}
          </div>
        ))}
      </div>
      <details className="mt-4 border-t border-line/70 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-2">What’s included</summary>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {v.costs.map((c) => (
            <li key={c.label} className="flex justify-between"><span className="text-ink-2">{c.label}</span><span className="tabular">{formatMoney(c.cents)}</span></li>
          ))}
          {v.costs.length === 0 && <li className="text-ink-3">No costs yet.</li>}
        </ul>
      </details>
      <p className="mt-3 text-xs text-ink-4">
        {v.basis === "estimated" ? "Estimated from the menu, staffing and planned costs. Becomes actual as you record food cost, expenses and staff pay. " : ""}
        {v.estimatedParts.length ? `Still estimated: ${v.estimatedParts.join(", ")}. ` : ""}
        This is the event’s contribution — before your general business costs. Company-wide profit is under Money.
      </p>
    </Card>
  );
}
