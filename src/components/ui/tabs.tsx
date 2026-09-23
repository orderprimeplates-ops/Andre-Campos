import Link from "next/link";
import { cn } from "@/lib/cn";

/** URL-driven tabs: each tab is a link, so the browser back button and sharing work. */
export function LinkTabs({
  tabs,
  active,
  className,
}: {
  tabs: { key: string; label: string; href: string; count?: number | string; alert?: boolean }[];
  active: string;
  className?: string;
}) {
  return (
    <nav className={cn("scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)} aria-label="Sections">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium transition-all duration-200",
              on ? "bg-espresso text-linen shadow-sm" : "text-ink-2 hover:bg-sand hover:text-ink",
            )}
            aria-current={on ? "page" : undefined}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("tabular text-[0.6875rem]", on ? "text-linen/70" : "text-ink-4")}>{t.count}</span>
            )}
            {t.alert && <span className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-champagne" : "bg-clay")} />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Segmented control for small view switches (Month / Week / Agenda). */
export function Segmented({
  options,
  active,
  className,
}: {
  options: { key: string; label: string; href: string }[];
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-sand/60 p-0.5", className)}>
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          scroll={false}
          className={cn(
            "rounded-[0.6rem] px-3 py-1.5 text-[0.8125rem] font-medium transition-all duration-200",
            o.key === active ? "bg-linen text-ink shadow-sm" : "text-ink-3 hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
