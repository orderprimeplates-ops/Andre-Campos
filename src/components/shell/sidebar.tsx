"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAV_GROUPS, SETTINGS_ITEM, isActive, type NavItem } from "./nav-config";
import { Wordmark } from "./brand";
import { openSearch } from "./search-palette";

function NavLink({ item, pathname, badge }: { item: NavItem; pathname: string; badge?: number }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[0.875rem] transition-all duration-200",
        active ? "bg-linen font-medium text-ink shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-sand/80 hover:text-ink",
      )}
    >
      {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-wine" />}
      <Icon className={cn("h-[18px] w-[18px] transition-colors", active ? "text-wine" : "text-ink-3 group-hover:text-ink-2")} strokeWidth={1.75} />
      <span className="flex-1">{item.label}</span>
      {!!badge && (
        <span className="min-w-5 rounded-full bg-wine px-1.5 py-0.5 text-center text-[0.6875rem] font-semibold leading-none text-linen tabular">{badge}</span>
      )}
    </Link>
  );
}

export function Sidebar({ userName, badges }: { userName: string; badges: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-line/80 bg-ivory lg:flex">
      <div className="px-6 pb-5 pt-6">
        <Link href="/" aria-label="Prime Plates HQ — Dashboard">
          <Wordmark />
        </Link>
      </div>
      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-linen/70 px-3 py-2 text-left text-[0.8125rem] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          <span className="flex-1">Search everything</span>
          <kbd className="rounded-md border border-line bg-sand px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-3">⌘K</kbd>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="mt-4 first:mt-1">
            <div className="eyebrow mb-1.5 px-3 text-[0.625rem]">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} badge={badges[item.href]} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line/80 px-4 py-3">
        <NavLink item={SETTINGS_ITEM} pathname={pathname} />
        <div className="mt-2 flex items-center justify-between rounded-xl px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[0.8125rem] font-medium text-ink">{userName}</div>
            <div className="text-[0.6875rem] text-ink-3">Owner · Executive Chef</div>
          </div>
          <form action="/logout" method="post">
            <button type="submit" className="rounded-lg p-2 text-ink-3 transition-colors hover:bg-sand hover:text-ink" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
