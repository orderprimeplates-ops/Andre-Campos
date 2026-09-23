"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle, CalendarClock, ChefHat, ChevronRight, CircleDollarSign, ClipboardList, Flame, Inbox, MessageCircle,
  ShoppingBasket, UsersRound, UtensilsCrossed, CheckCircle2, FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AttentionItem, AttentionKind, Priority } from "@/lib/domain/attention";

const ICONS: Record<AttentionKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "event-soon": Flame,
  "final-count": UsersRound,
  "menu-approval": UtensilsCrossed,
  "menu-missing": UtensilsCrossed,
  deposit: CircleDollarSign,
  balance: CircleDollarSign,
  staffing: UsersRound,
  kitchen: ChefHat,
  shopping: ShoppingBasket,
  prep: ClipboardList,
  "close-out": FileCheck2,
  "lead-follow-up": MessageCircle,
  "lead-new": Inbox,
};

const PRIORITY: Record<Priority, { ring: string; icon: string; label: string; dot: string }> = {
  urgent: { ring: "bg-clay-soft", icon: "text-clay", label: "Today", dot: "bg-clay" },
  soon: { ring: "bg-amber-soft", icon: "text-amber", label: "This week", dot: "bg-amber" },
  info: { ring: "bg-slate-soft", icon: "text-slate", label: "Heads-up", dot: "bg-slate" },
};

export function AttentionList({ items, initial = 7 }: { items: AttentionItem[]; initial?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-sage-soft/50 px-6 py-10 text-center">
        <CheckCircle2 className="mb-2 h-7 w-7 text-sage" strokeWidth={1.5} />
        <div className="font-display text-xl">All clear</div>
        <p className="mt-1 text-sm text-ink-3">Nothing needs your attention right now.</p>
      </div>
    );
  }
  const shown = expanded ? items : items.slice(0, initial);
  const counts = { urgent: items.filter((i) => i.priority === "urgent").length, soon: items.filter((i) => i.priority === "soon").length };

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-ink-3">
        {counts.urgent > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-clay" />{counts.urgent} need action</span>}
        {counts.soon > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber" />{counts.soon} coming up</span>}
      </div>
      <ul className="-mx-2 space-y-0.5">
        {shown.map((item, idx) => {
          const Icon = ICONS[item.kind] ?? AlertCircle;
          const p = PRIORITY[item.priority];
          return (
            <li key={item.id} style={{ animationDelay: `${idx * 35}ms` }} className="animate-fade-up">
              <Link href={item.href} className="group flex items-center gap-3.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-sand/70">
                <span className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", p.ring)}>
                  <Icon className={cn("h-[18px] w-[18px]", p.icon)} strokeWidth={1.75} />
                  {item.priority === "urgent" && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-clay ring-2 ring-linen" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[0.9375rem] font-medium text-ink">{item.title}</span>
                  </span>
                  <span className="block truncate text-[0.8125rem] text-ink-3">
                    <span className="text-ink-2">{item.subject}</span> · {item.detail}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-3" />
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > initial && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="mt-2 flex items-center gap-1.5 text-[0.8125rem] font-medium text-wine hover:text-wine-deep">
          <CalendarClock className="h-4 w-4" />
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}
