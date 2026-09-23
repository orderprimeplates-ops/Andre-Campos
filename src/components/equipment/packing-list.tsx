"use client";

import { useOptimistic, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { PACK_ORDER, PACK_STATUS, TONE_CLASSES } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/remove-button";
import { advanceAllPacking, removeEventEquipment, setPackQuantity, setPackStatus } from "@/app/(app)/events/actions/equipment";
import type { PackStatus } from "@/generated/prisma/enums";

export interface PackRow {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available: number;
  status: string;
  notes: string | null;
  location: string | null;
  short: boolean;
}

export function PackingList({ eventId, rows }: { eventId: string; rows: PackRow[] }) {
  const [, start] = useTransition();
  const [list, update] = useOptimistic(rows, (s, p: { id: string; status?: string; quantity?: number }) => s.map((r) => (r.id === p.id ? { ...r, ...p } : r)));
  const counts = Object.fromEntries(PACK_ORDER.map((s) => [s, list.filter((r) => r.status === s).length]));
  const bulk: [PackStatus, PackStatus, string][] = [
    ["REQUIRED", "PACKED", "Mark all packed"],
    ["PACKED", "LOADED", "All loaded"],
    ["LOADED", "ON_SITE", "All on site"],
    ["ON_SITE", "RETURNED", "All returned"],
  ];
  const nextBulk = bulk.find(([from]) => counts[from] > 0);
  const categories = [...new Set(list.map((r) => r.category))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PACK_ORDER.map((s) => (
          <span key={s} className={cn("rounded-full px-3 py-1 text-xs font-medium", counts[s] ? TONE_CLASSES[PACK_STATUS[s].tone].pill : "bg-sand/50 text-ink-4")}>
            {PACK_STATUS[s].label} · {counts[s]}
          </span>
        ))}
        {nextBulk && (
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => start(() => advanceAllPacking(eventId, nextBulk[0], nextBulk[1]))}>
            {nextBulk[2]}
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {categories.map((c) => (
          <section key={c}>
            <div className="eyebrow mb-1.5 px-1">{c}</div>
            <ul className="overflow-hidden rounded-2xl border border-line/70 bg-linen">
              {list.filter((r) => r.category === c).map((r) => {
                const idx = PACK_ORDER.indexOf(r.status as PackStatus);
                const short = r.quantity > r.available || r.short;
                return (
                  <li key={r.id} className="flex flex-col gap-2 border-b border-line/60 px-4 py-3 last:border-0 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink">{r.name}</div>
                      <div className="text-xs text-ink-3">
                        {r.location ?? "No storage location"}
                        {r.notes ? ` · ${r.notes}` : ""}
                        {short && <span className="font-medium text-clay"> · short — {r.available} available</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border border-line">
                        <button
                          type="button"
                          className="p-1.5 text-ink-3 hover:text-ink disabled:opacity-40"
                          aria-label="Fewer"
                          disabled={r.quantity <= 1}
                          onClick={() => start(async () => { update({ id: r.id, quantity: r.quantity - 1 }); await setPackQuantity(r.id, r.quantity - 1); })}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className={cn("w-8 text-center text-sm tabular", short && "font-semibold text-clay")}>{r.quantity}</span>
                        <button
                          type="button"
                          className="p-1.5 text-ink-3 hover:text-ink"
                          aria-label="More"
                          onClick={() => start(async () => { update({ id: r.id, quantity: r.quantity + 1 }); await setPackQuantity(r.id, r.quantity + 1); })}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex overflow-hidden rounded-full border border-line">
                        {PACK_ORDER.map((s, i) => (
                          <button
                            key={s}
                            type="button"
                            title={PACK_STATUS[s].label}
                            onClick={() => start(async () => { update({ id: r.id, status: s }); await setPackStatus(r.id, s); })}
                            className={cn(
                              "px-2 py-1.5 text-[0.6875rem] font-medium transition-colors sm:px-2.5",
                              i <= idx ? TONE_CLASSES[PACK_STATUS[r.status].tone].pill : "text-ink-4 hover:bg-sand",
                            )}
                          >
                            {PACK_STATUS[s].label}
                          </button>
                        ))}
                      </div>
                      <RemoveButton action={removeEventEquipment.bind(null, r.id)} label={`Remove ${r.name}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
