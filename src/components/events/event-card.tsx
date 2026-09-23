import Link from "next/link";
import { Clock, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EventSummary } from "@/lib/server/events";
import { formatDate, formatTime, relativeDay, type ISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { EVENT_STATUS, EVENT_TYPE, PAYMENT_STATUS, TONE_CLASSES, metaOf } from "@/lib/status";
import { Badge } from "@/components/ui/badge";
import { DateBlock, ProgressRing } from "@/components/ui/misc";

export function EventCard({ e, today, className }: { e: EventSummary; today: ISODate; className?: string }) {
  const type = metaOf(EVENT_TYPE, e.eventType);
  const pay = metaOf(PAYMENT_STATUS, e.payment.status);
  const status = metaOf(EVENT_STATUS, e.status);
  const readinessTone = e.readinessPct >= 80 ? "sage" : e.readinessPct >= 50 ? "amber" : "clay";
  return (
    <Link
      href={`/events/${e.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line/70 bg-linen shadow-[var(--shadow-card)] transition-all duration-300 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", TONE_CLASSES[type.tone].bar)} />
      <div className="flex items-start gap-4 p-5">
        <DateBlock date={e.date} tone={type.tone} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-ink-3">
            <span className={cn("font-medium", TONE_CLASSES[type.tone].text)}>{type.label}</span>
            <span className="mx-1.5">·</span>
            {relativeDay(e.date, today)}
          </div>
          <div className="mt-1 line-clamp-2 font-display text-[1.3rem] leading-snug text-ink">{e.name}</div>
          <div className="mt-0.5 truncate text-[0.8125rem] text-ink-2">{e.client.company ?? e.client.name}</div>
        </div>
        <div title={`Readiness: ${e.checks.map((c) => `${c.done ? "✓" : "○"} ${c.label}`).join(", ")}`} className="flex flex-col items-center gap-1">
          <ProgressRing value={e.readinessPct} tone={readinessTone} size={42}>
            {e.readinessPct}%
          </ProgressRing>
          <span className="text-[0.625rem] uppercase tracking-[0.1em] text-ink-4">Ready</span>
        </div>
      </div>
      <div className="mx-5 grid grid-cols-3 gap-2 border-t border-line/70 py-3.5 text-[0.8125rem] text-ink-2">
        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-ink-4" />{e.guestCount} guests</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-ink-4" />{e.serviceTime ? formatTime(e.serviceTime) : "TBD"}</span>
        <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 text-ink-4" /><span className="truncate">{e.venue?.city ?? "No venue"}</span></span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 bg-sand/40 px-5 py-3">
        <span className="font-display text-[1.25rem] tabular text-ink">{formatMoney(e.priceCents)}</span>
        <div className="flex items-center gap-1.5">
          <Badge tone={pay.tone} size="xs">{pay.label}</Badge>
          <Badge tone={status.tone} size="xs" dot>{status.label}</Badge>
        </div>
      </div>
    </Link>
  );
}

export function EventRow({ e, today }: { e: EventSummary; today: ISODate }) {
  const type = metaOf(EVENT_TYPE, e.eventType);
  const status = metaOf(EVENT_STATUS, e.status);
  const pay = metaOf(PAYMENT_STATUS, e.payment.status);
  return (
    <Link href={`/events/${e.id}`} className="group flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors hover:bg-sand/60">
      <DateBlock date={e.date} tone={type.tone} className="h-12 w-11" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-medium text-ink">{e.name}</div>
        <div className="truncate text-[0.8125rem] text-ink-3">
          {e.client.company ?? e.client.name} · {type.label} · {e.guestCount} guests · {formatDate.weekday(e.date)} {relativeDay(e.date, today)}
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-sm font-medium tabular text-ink">{formatMoney(e.priceCents)}</div>
        <div className="text-xs text-ink-3">{pay.label}</div>
      </div>
      <Badge tone={status.tone} size="xs" dot className="hidden md:inline-flex">{status.label}</Badge>
    </Link>
  );
}
