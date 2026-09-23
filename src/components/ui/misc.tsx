import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone } from "@/lib/status";
import { formatDate, type ISODate } from "@/lib/domain/dates";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong/70 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 text-ink-4">{icon}</div>}
      <div className="font-display text-xl text-ink">{title}</div>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ name, className, tone = "neutral" }: { name: string; className?: string; tone?: Tone }) {
  const initials = name
    .replace(/^(the|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "")
    .split(/[\s&–-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[0.95rem] font-semibold",
        TONE_CLASSES[tone].pill,
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function ProgressBar({ value, tone = "sage", className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-sand", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-soft)]", TONE_CLASSES[tone].bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({ value, size = 44, stroke = 4, tone = "sage", children }: { value: number; size?: number; stroke?: number; tone?: Tone; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const colorVar: Record<Tone, string> = {
    neutral: "var(--color-ink-4)", wine: "var(--color-wine)", sage: "var(--color-sage)", amber: "var(--color-amber)",
    clay: "var(--color-clay)", slate: "var(--color-slate)", ocean: "var(--color-ocean)", plum: "var(--color-plum)", champagne: "var(--color-champagne)",
  };
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sand)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorVar[tone]} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[0.6875rem] font-semibold text-ink-2 tabular">{children}</div>
    </div>
  );
}

/** Calendar-page style date block: "OCT / 3". */
export function DateBlock({ date, className, tone = "neutral" }: { date: ISODate; className?: string; tone?: Tone }) {
  return (
    <div className={cn("flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-linen", className)}>
      <span className={cn("text-[0.625rem] font-semibold uppercase tracking-[0.12em]", tone === "neutral" ? "text-wine" : TONE_CLASSES[tone].text)}>
        {formatDate.monthShort(date)}
      </span>
      <span className="font-display text-[1.45rem] leading-none text-ink">{formatDate.day(date)}</span>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function KeyValue({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-0.5 text-sm text-ink">{children ?? <span className="text-ink-4">—</span>}</div>
    </div>
  );
}
