import { cn } from "@/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="var(--color-espresso)" />
      <circle cx="20" cy="20" r="12" fill="none" stroke="var(--color-ivory)" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="7.8" fill="none" stroke="var(--color-champagne)" strokeWidth="1" />
      <circle cx="20" cy="20" r="1.9" fill="var(--color-champagne)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark />
      <div className="leading-none">
        <div className="font-display text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">Prime Plates</div>
        <div className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.28em] text-champagne">Headquarters</div>
      </div>
    </div>
  );
}
