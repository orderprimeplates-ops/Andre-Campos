"use client";

import { useState } from "react";
import { formatMoney, formatMoneyCompact } from "@/lib/domain/money";

export interface MonthPoint { key: string; label: string; revenueCents: number; profitCents: number; events: number }

// Validated pair (dataviz validator, light surface #fffdf9): profit + costs.
const PROFIT = "#9b3f4d";
const COSTS = "#b88a35";

/** Monthly revenue as stacked bars: profit (bottom) + costs (top) = revenue. One axis. */
export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.revenueCents));
  const nice = niceMax(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * nice);
  const H = 220;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PROFIT }} />Projected profit</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COSTS }} />Costs</span>
        <span className="text-ink-4">Bar height = booked revenue</span>
        <button type="button" onClick={() => setTable((t) => !t)} className="ml-auto text-xs font-medium text-ink-3 hover:text-wine">{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <table className="w-full text-sm">
          <thead className="text-xs text-ink-3"><tr className="border-b border-line"><th className="py-2 text-left font-medium">Month</th><th className="py-2 text-right font-medium">Events</th><th className="py-2 text-right font-medium">Revenue</th><th className="py-2 text-right font-medium">Profit</th></tr></thead>
          <tbody className="divide-y divide-line/60">
            {data.map((d) => <tr key={d.key}><td className="py-2">{d.label}</td><td className="py-2 text-right tabular">{d.events}</td><td className="py-2 text-right tabular">{formatMoney(d.revenueCents)}</td><td className="py-2 text-right tabular">{formatMoney(d.profitCents)}</td></tr>)}
          </tbody>
        </table>
      ) : (
        <div className="relative flex gap-3">
          <div className="relative w-12 shrink-0 text-right text-[0.6875rem] text-ink-4" style={{ height: H }}>
            {ticks.map((t) => <span key={t} className="absolute right-0 -translate-y-1/2 tabular" style={{ top: H - (t / nice) * H }}>{formatMoneyCompact(t)}</span>)}
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-x-0 top-0" style={{ height: H }}>
              {ticks.map((t) => <div key={t} className="absolute inset-x-0 border-t border-line/70" style={{ top: H - (t / nice) * H }} />)}
            </div>
            <div className="relative flex items-end gap-[2px]" style={{ height: H }}>
              {data.map((d, i) => {
                const rev = (d.revenueCents / nice) * H;
                const profit = (Math.max(0, d.profitCents) / nice) * H;
                const costs = Math.max(0, rev - profit);
                return (
                  <div key={d.key} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                    <div className="mx-auto flex w-full max-w-[2.75rem] flex-col justify-end gap-[2px]" style={{ opacity: hover === null || hover === i ? 1 : 0.55 }}>
                      {costs > 0 && <div style={{ height: costs, background: COSTS }} className="rounded-t-[4px]" />}
                      {profit > 0 && <div style={{ height: profit, background: PROFIT }} className={costs > 0 ? "" : "rounded-t-[4px]"} />}
                    </div>
                    {hover === i && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-xl border border-line bg-linen px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
                        <div className="font-medium text-ink">{d.label} · {d.events} event{d.events === 1 ? "" : "s"}</div>
                        <div className="mt-1 flex justify-between text-ink-2"><span>Revenue</span><span className="tabular">{formatMoney(d.revenueCents)}</span></div>
                        <div className="flex justify-between text-ink-2"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: PROFIT }} />Profit</span><span className="tabular">{formatMoney(d.profitCents)}</span></div>
                        <div className="flex justify-between text-ink-2"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: COSTS }} />Costs</span><span className="tabular">{formatMoney(d.revenueCents - d.profitCents)}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-[2px]">
              {data.map((d) => <div key={d.key} className="flex-1 text-center text-[0.6875rem] text-ink-3">{d.label.slice(0, 3)}</div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}
