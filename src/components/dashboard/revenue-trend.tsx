import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/domain/dates";
import { formatMoneyCompact, formatMoney } from "@/lib/domain/money";
import type { MonthRow } from "@/lib/domain/reporting";

const BAR = "#7a2e3a";
const hatch = `repeating-linear-gradient(135deg, ${BAR} 0 4px, color-mix(in srgb, ${BAR} 50%, #fffdf9) 4px 7px)`;

/** Collected revenue per month this year. Hatched = historical entry. Taps through to Money. */
export function RevenueTrend({ rows, year }: { rows: MonthRow[]; year: string }) {
  const max = Math.max(1, ...rows.map((r) => r.collectedCents));
  return (
    <div>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="eyebrow mb-1">Trend</div>
          <h2 className="font-display text-[1.45rem] leading-tight">{year} revenue by month</h2>
        </div>
        <Link href="/money" className="flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-wine">Money <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="flex h-32 items-end gap-1.5" role="img" aria-label={`${year} collected revenue by month`}>
        {rows.map((r) => (
          <div key={r.month} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDate.month(`${r.month}-01`)}: ${r.source === "none" ? "not entered" : formatMoney(r.collectedCents)}${r.source === "historical" ? " (historical)" : ""}`}>
            {r.collectedCents > 0 && (
              <div className="w-full rounded-t-[4px]" style={{ height: `${Math.max(3, (r.collectedCents / max) * 100)}%`, background: r.source === "historical" ? hatch : BAR }} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {rows.map((r) => <div key={r.month} className="flex-1 text-center text-[0.625rem] text-ink-3">{formatDate.monthShort(`${r.month}-01`).slice(0, 1)}</div>)}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[0.6875rem] text-ink-3">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: hatch }} />historical entry</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: BAR }} />payments in HQ</span>
        <span className="ml-auto tabular">peak {formatMoneyCompact(max)}</span>
      </div>
    </div>
  );
}
