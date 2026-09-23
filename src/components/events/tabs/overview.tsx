import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { formatDate, formatTime, relativeDay, toISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney, formatPct } from "@/lib/domain/money";
import { MENU_STATUS, PAYMENT_STATUS, STAFF_ROLE, STAFF_STATUS, metaOf } from "@/lib/status";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusDot } from "@/components/ui/badge";
import { ProgressBar, ProgressRing } from "@/components/ui/misc";
import { cn } from "@/lib/cn";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

const CHECK_TAB: Record<string, string> = {
  "Menu approved": "menu", "Guest count confirmed": "guests", "Deposit received": "financials",
  "Staff confirmed": "staff", "Kitchen details": "venue", "Prep complete": "prep",
};

export function OverviewTab({ ws, today, tabHref }: { ws: WS; today: ISODate; tabHref: (t: string) => string }) {
  const { event: e, summary: s } = ws;
  const href = tabHref;
  const p = s.projection;
  const pay = metaOf(PAYMENT_STATUS, s.payment.status);
  const readyTone = s.readinessPct >= 80 ? "sage" : s.readinessPct >= 50 ? "amber" : "clay";
  const marginTone = p.marginStatus === "below-minimum" ? "text-clay" : p.marginStatus === "below-target" ? "text-amber" : "text-sage";
  const dates: [string, Date | null][] = [
    ["Deposit due", s.payment.depositOutstandingCents > 0 ? e.depositDueDate : null],
    ["Final count due", e.guestCountConfirmed ? null : e.finalCountDueDate],
    ["Prep begins", e.prepStartDate],
    ["Shopping day", e.shoppingDate],
    ["Balance due", s.payment.balanceCents > 0 ? e.balanceDueDate : null],
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardBody className="pt-5 sm:pt-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <ProgressRing value={s.readinessPct} size={76} stroke={6} tone={readyTone}>
                  <span className="font-display text-xl text-ink">{s.readinessPct}%</span>
                </ProgressRing>
                <div>
                  <div className="eyebrow">Readiness</div>
                  <div className="font-display text-2xl leading-tight">
                    {s.readinessPct === 100 ? "Ready to cook" : `${s.checks.filter((c) => !c.done).length} to go`}
                  </div>
                </div>
              </div>
              <ul className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {s.checks.map((c) => (
                  <li key={c.label}>
                    <Link href={href(CHECK_TAB[c.label] ?? "overview")} className="group flex items-center gap-2.5 text-sm">
                      {c.done ? <CheckCircle2 className="h-[18px] w-[18px] text-sage" /> : <Circle className="h-[18px] w-[18px] text-ink-4" />}
                      <span className={cn(c.done ? "text-ink-3" : "text-ink group-hover:text-wine")}>{c.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Arrive", e.arrivalTime],
            ["Service", e.serviceTime],
            ["Wrap", e.endTime],
          ].map(([label, t]) => (
            <Card key={label} className="p-5">
              <div className="eyebrow">{label}</div>
              <div className="mt-1 font-display text-[2rem] leading-none tabular">{t ? formatTime(t) : <span className="text-ink-4">—</span>}</div>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader
            title="Menu"
            action={<Link href={href("menu")} className="flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-wine">Build menu <ArrowRight className="h-3.5 w-3.5" /></Link>}
            description={e.menu ? <Badge tone={metaOf(MENU_STATUS, e.menu.status).tone} size="xs">{metaOf(MENU_STATUS, e.menu.status).label}</Badge> : undefined}
          />
          <CardBody>
            {!e.menu || s.menuItemCount === 0 ? (
              <p className="text-sm text-ink-3">No dishes yet. <Link href={href("menu")} className="text-wine hover:underline">Start the menu →</Link></p>
            ) : (
              <div className="space-y-4">
                {e.menu.courses.filter((c) => c.items.length).map((c) => (
                  <div key={c.id} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                    <div className="eyebrow pt-1">{c.name}{c.fireTime ? ` · ${formatTime(c.fireTime)}` : ""}</div>
                    <div className="space-y-1.5">
                      {c.items.map((i) => (
                        <div key={i.id}>
                          <span className="font-display text-[1.15rem] text-ink">{i.dish.name}</span>
                          {i.guestCount ? <span className="ml-2 text-xs text-ink-3">× {i.guestCount}</span> : null}
                          {i.dish.description && <div className="text-[0.8125rem] text-ink-3">{i.dish.description}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Team" action={<Link href={href("staff")} className="flex items-center gap-1 text-[0.8125rem] font-medium text-ink-3 hover:text-wine">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          <CardBody>
            {e.staffAssignments.length === 0 ? (
              <p className="text-sm text-ink-3">No staff assigned.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {e.staffAssignments.map((a) => {
                  const st = metaOf(STAFF_STATUS, a.status);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <div className={cn("truncate font-medium", !a.staffMember && "text-clay")}>{a.staffMember?.name ?? "Unfilled"}</div>
                        <div className="text-xs text-ink-3">{STAFF_ROLE[a.role]}{a.callTime ? ` · call ${formatTime(a.callTime)}` : ""}</div>
                      </div>
                      <StatusDot tone={st.tone}>{st.label}</StatusDot>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader title="Economics" action={<Link href={href("financials")} className="text-[0.8125rem] font-medium text-ink-3 hover:text-wine">Details</Link>} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-ink-3">Client price</div>
                <div className="font-display text-[1.9rem] leading-none tabular">{formatMoney(s.priceCents)}</div>
                <div className="mt-1 text-xs text-ink-3">{p.pricePerGuestCents ? `${formatMoney(p.pricePerGuestCents)} / guest` : ""}</div>
              </div>
              <div>
                <div className="text-xs text-ink-3">Projected profit</div>
                <div className="font-display text-[1.9rem] leading-none tabular">{formatMoney(p.profitCents)}</div>
                <div className={cn("mt-1 text-xs font-medium", marginTone)}>{formatPct(p.marginPct)} margin</div>
              </div>
            </div>
            {p.marginStatus === "below-minimum" && (
              <div className="flex gap-2 rounded-xl bg-clay-soft px-3.5 py-2.5 text-[0.8125rem] text-clay">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong className="font-semibold">Low margin.</strong> Minimum acceptable price is {formatMoney(p.minimumPriceCents)}.</span>
              </div>
            )}
            <div className="space-y-2 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><span className="text-ink-3">Food cost</span><span className="tabular">{formatMoney(s.foodCost.cents)}{p.foodCostPct !== null ? <span className="ml-1.5 text-xs text-ink-3">{formatPct(p.foodCostPct)}</span> : null}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">Labor</span><span className="tabular">{formatMoney(s.laborCents)}</span></div>
              <div className="flex justify-between"><span className="text-ink-3">All costs</span><span className="tabular">{formatMoney(p.totalCostCents)}</span></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Payments" action={<Badge tone={pay.tone} size="xs">{pay.label}</Badge>} />
          <CardBody className="space-y-3">
            <ProgressBar value={s.priceCents ? (s.payment.collectedCents / s.priceCents) * 100 : 0} tone="sage" />
            <div className="flex justify-between text-sm">
              <span><span className="tabular font-medium">{formatMoney(s.payment.collectedCents)}</span> <span className="text-ink-3">collected</span></span>
              <span><span className="tabular font-medium">{formatMoney(s.payment.balanceCents)}</span> <span className="text-ink-3">due</span></span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Key dates" />
          <CardBody className="space-y-2.5">
            {dates.filter(([, d]) => d).map(([label, d]) => {
              const iso = toISODate(d!);
              const late = iso < today && label !== "Prep begins" && label !== "Shopping day";
              return (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className={cn("tabular", late ? "font-medium text-clay" : "text-ink")}>{formatDate.short(iso)} <span className="text-xs text-ink-3">· {relativeDay(iso, today)}</span></span>
                </div>
              );
            })}
            {dates.every(([, d]) => !d) && <p className="text-sm text-ink-4">Nothing pending.</p>}
          </CardBody>
        </Card>

        {(e.description || e.criticalNotes) && (
          <Card className="bg-sand/40">
            <CardBody className="space-y-3 pt-5 text-sm">
              {e.criticalNotes && <div><div className="eyebrow mb-1 text-clay">Critical</div><p className="whitespace-pre-line text-ink">{e.criticalNotes}</p></div>}
              {e.description && <div><div className="eyebrow mb-1">About</div><p className="whitespace-pre-line text-ink-2">{e.description}</p></div>}
            </CardBody>
          </Card>
        )}
      </aside>
    </div>
  );
}
