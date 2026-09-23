"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { platformFees, priceForNet, projectEvent, type ExpenseInput, type PlatformFees } from "@/lib/domain/finance";
import { formatMoney, formatPct, parseMoney } from "@/lib/domain/money";
import { Button } from "@/components/ui/button";
import { setEventPlatform, setEventPrice } from "@/app/(app)/events/actions/finance";

export interface PlatformOption extends PlatformFees {
  id: string;
  name: string;
}

/**
 * Try any client price and see the economics instantly. Nothing is saved until you choose
 * "Use this price". Uses the same engine as the rest of the app, so numbers always agree.
 */
export function PriceTester({
  eventId, priceCents, guestCount, foodCostCents, laborCents, roundTripMiles, expenses, platforms, platformId, settings,
}: {
  eventId: string;
  priceCents: number;
  guestCount: number;
  foodCostCents: number;
  laborCents: number;
  roundTripMiles: number | null;
  expenses: ExpenseInput[];
  platforms: PlatformOption[];
  platformId: string | null;
  settings: { targetMarginPct: number; minimumMarginPct: number; mileageRateCents: number };
}) {
  const [input, setInput] = useState(String(priceCents / 100));
  const [perGuest, setPerGuest] = useState(false);
  const [net, setNet] = useState("");
  const [pending, start] = useTransition();
  const platform = platforms.find((p) => p.id === platformId) ?? null;
  const typed = parseMoney(input) ?? 0;
  const testCents = perGuest ? typed * guestCount : typed;

  const p = useMemo(
    () => projectEvent({ priceCents: testCents, guestCount, foodCostCents, laborCents, roundTripMiles, expenses, platform, settings }),
    [testCents, guestCount, foodCostCents, laborCents, roundTripMiles, expenses, platform, settings],
  );
  const fees = platformFees(testCents, platform);
  const netCents = parseMoney(net);
  const netPrice = netCents ? priceForNet(netCents, platform) : null;
  const changed = testCents !== priceCents;
  const sliderMax = Math.max(p.recommendedPriceCents * 1.6, priceCents * 1.5, 100000);
  const setCents = (c: number) => setInput(String(Math.round(perGuest ? c / guestCount : c) / 100));

  const statusTone = p.marginStatus === "below-minimum" ? "clay" : p.marginStatus === "below-target" ? "amber" : "sage";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem] flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="test-price" className="text-[0.8125rem] font-medium text-ink-2">Test a client price</label>
            <div className="inline-flex rounded-lg border border-line bg-sand/60 p-0.5 text-xs">
              {[false, true].map((pg) => (
                <button key={String(pg)} type="button" onClick={() => { setPerGuest(pg); setInput(String(Math.round(pg ? testCents / guestCount : testCents) / 100)); }}
                  className={cn("rounded-md px-2 py-1 font-medium", perGuest === pg ? "bg-linen text-ink shadow-sm" : "text-ink-3")}>
                  {pg ? "Per guest" : "Total"}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-2xl text-ink-3">$</span>
            <input
              id="test-price"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-16 w-full rounded-2xl border border-line-strong/60 bg-white/80 pl-10 pr-4 font-display text-[2.2rem] tabular text-ink focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10"
            />
          </div>
        </div>
        <Button
          variant={changed ? "wine" : "secondary"}
          size="lg"
          disabled={!changed || pending || testCents <= 0}
          onClick={() => start(() => setEventPrice(eventId, testCents, true))}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {changed ? "Use this price" : "Current price"}
        </Button>
      </div>

      <input
        type="range"
        min={0}
        max={sliderMax}
        step={2500}
        value={Math.min(testCents, sliderMax)}
        onChange={(e) => setCents(Number(e.target.value))}
        className="w-full accent-[var(--color-wine)]"
        aria-label="Price slider"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Profit" value={formatMoney(p.profitCents)} tone={p.profitCents < 0 ? "clay" : undefined} />
        <Metric label="Margin" value={formatPct(p.marginPct)} tone={statusTone} note={`target ${settings.targetMarginPct}%`} />
        <Metric label="Price per guest" value={formatMoney(p.pricePerGuestCents)} note={`${guestCount} guests`} />
        <Metric label="Food cost / guest" value={formatMoney(p.foodCostPerGuestCents)} note={p.foodCostPct !== null ? `${p.foodCostPct.toFixed(0)}% of price` : undefined} />
      </div>

      {p.marginStatus === "below-minimum" && testCents > 0 && (
        <div className="flex gap-3 rounded-2xl border border-clay/20 bg-clay-soft/70 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div className="text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-clay">Low margin</div>
            <p className="text-ink">At {formatMoney(testCents)} this event is projected to generate a {formatPct(p.marginPct)} margin — below your {settings.minimumMarginPct}% minimum.</p>
          </div>
        </div>
      )}
      {p.marginStatus === "below-target" && (
        <p className="rounded-2xl bg-amber-soft/70 px-4 py-3 text-sm text-ink">
          Above your minimum, but under your {settings.targetMarginPct}% target. Fine if it’s strategic.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setCents(p.recommendedPriceCents)} className="rounded-2xl border border-sage/30 bg-sage-soft/50 px-4 py-3 text-left transition-colors hover:bg-sage-soft">
          <div className="text-xs font-medium text-sage">Recommended · {settings.targetMarginPct}% margin</div>
          <div className="font-display text-2xl tabular text-ink">{formatMoney(p.recommendedPriceCents)}</div>
          <div className="text-xs text-ink-3">{formatMoney(Math.round(p.recommendedPriceCents / guestCount))} per guest</div>
        </button>
        <button type="button" onClick={() => setCents(p.minimumPriceCents)} className="rounded-2xl border border-line bg-linen px-4 py-3 text-left transition-colors hover:bg-sand/60">
          <div className="text-xs font-medium text-ink-3">Minimum acceptable · {settings.minimumMarginPct}% margin</div>
          <div className="font-display text-2xl tabular text-ink">{formatMoney(p.minimumPriceCents)}</div>
          <div className="text-xs text-ink-3">{formatMoney(Math.round(p.minimumPriceCents / guestCount))} per guest</div>
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-sand/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-ink-2" htmlFor="platform">Booking platform</label>
          <select
            id="platform"
            value={platformId ?? ""}
            disabled={pending}
            onChange={(e) => start(() => setEventPlatform(eventId, e.target.value || null))}
            className="h-9 rounded-lg border border-line-strong/60 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-wine/20"
          >
            <option value="">None</option>
            {platforms.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
          <span className="text-xs text-ink-3">
            {platform ? `${platform.commissionPct}% commission${platform.fixedFeeCents ? ` + ${formatMoney(platform.fixedFeeCents)}` : ""} · ${platform.processingPct}% processing${platform.processingFixedCents ? ` + ${formatMoney(platform.processingFixedCents)}` : ""}` : "No fees"}
            {testCents > 0 && ` → ${formatMoney(fees.totalCents)} in fees, you receive ${formatMoney(fees.netCents)}`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-2">To take home</span>
          <div className="relative w-32">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">$</span>
            <input value={net} onChange={(e) => setNet(e.target.value)} inputMode="decimal" placeholder="2,000" className="h-9 w-full rounded-lg border border-line-strong/60 bg-white pl-6 pr-2 tabular focus:outline-none focus:ring-2 focus:ring-wine/20" aria-label="Desired net" />
          </div>
          <span className="text-ink-2">after platform fees, charge</span>
          <span className="font-display text-xl tabular text-ink">{netPrice && Number.isFinite(netPrice) ? formatMoney(netPrice) : "—"}</span>
          {netPrice && Number.isFinite(netPrice) && (
            <button type="button" onClick={() => setCents(netPrice)} className="text-xs font-medium text-wine hover:underline">test it</button>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "clay" | "amber" | "sage" }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-linen px-4 py-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className={cn("mt-0.5 font-display text-[1.6rem] leading-tight tabular", tone === "clay" ? "text-clay" : tone === "amber" ? "text-amber" : tone === "sage" ? "text-sage" : "text-ink")}>{value}</div>
      {note && <div className="text-[0.6875rem] text-ink-4">{note}</div>}
    </div>
  );
}
