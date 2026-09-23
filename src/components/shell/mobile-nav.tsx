"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MOBILE_TABS, NAV_GROUPS, SETTINGS_ITEM, isActive } from "./nav-config";
import { BrandMark } from "./brand";
import { openSearch } from "./search-palette";

export function MobileTopBar() {
  return (
    <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line/60 bg-ivory/85 px-4 pb-2.5 pt-[max(env(safe-area-inset-top),0.625rem)] backdrop-blur-xl lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark className="h-8 w-8" />
        <span className="font-display text-[1.2rem] font-semibold">Prime Plates</span>
      </Link>
      <button type="button" onClick={openSearch} className="rounded-full p-2.5 text-ink-2 active:bg-sand" aria-label="Search">
        <Search className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function MobileTabBar({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = !MOBILE_TABS.some((t) => isActive(pathname, t.href));

  return (
    <>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-linen/90 pb-safe backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_TABS.map((t) => {
            const active = isActive(pathname, t.href);
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className="relative flex flex-col items-center gap-1 pb-1 pt-2.5">
                <Icon className={cn("h-[22px] w-[22px]", active ? "text-wine" : "text-ink-3")} strokeWidth={active ? 2 : 1.6} />
                <span className={cn("text-[0.625rem] font-medium", active ? "text-ink" : "text-ink-3")}>{t.label}</span>
                {!!badges[t.href] && <span className="absolute right-[26%] top-1.5 h-2 w-2 rounded-full bg-wine ring-2 ring-linen" />}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 pb-1 pt-2.5">
            <Menu className={cn("h-[22px] w-[22px]", inMore ? "text-wine" : "text-ink-3")} strokeWidth={inMore ? 2 : 1.6} />
            <span className={cn("text-[0.625rem] font-medium", inMore ? "text-ink" : "text-ink-3")}>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <div className="absolute inset-0 animate-fade-in bg-ink/30 backdrop-blur-[2px]" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-sheet-up overflow-y-auto rounded-t-[1.75rem] bg-linen px-5 pb-safe pt-3 shadow-[var(--shadow-pop)]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
            <div className="mb-2 flex items-center justify-between">
              <div className="font-display text-2xl">Everything</div>
              <button type="button" onClick={() => setMoreOpen(false)} className="rounded-full p-2 text-ink-3" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {NAV_GROUPS.map((g) => (
              <div key={g.label} className="mb-4">
                <div className="eyebrow mb-2">{g.label}</div>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center text-[0.75rem] font-medium",
                          active ? "border-wine/30 bg-wine-soft text-wine" : "border-line bg-ivory text-ink-2 active:bg-sand",
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                        {item.label}
                        {!!badges[item.href] && (
                          <span className="absolute right-2 top-2 rounded-full bg-wine px-1.5 text-[0.625rem] font-semibold text-linen">{badges[item.href]}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-line pb-4 pt-3">
              <Link href={SETTINGS_ITEM.href} onClick={() => setMoreOpen(false)} className="flex flex-1 items-center gap-2 rounded-xl px-3 py-3 text-sm text-ink-2 active:bg-sand">
                <SETTINGS_ITEM.icon className="h-4 w-4" /> Settings & platforms
              </Link>
              <form action="/logout" method="post">
                <button type="submit" className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-ink-3 active:bg-sand">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
