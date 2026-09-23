import { cn } from "@/lib/cn";
import { TONE_CLASSES, type Tone } from "@/lib/status";

export function Badge({
  tone = "neutral",
  children,
  className,
  dot = false,
  size = "sm",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: "xs" | "sm";
}) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "xs" ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-xs",
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

/** A quiet coloured dot + label, for places where a pill would be too loud. */
export function StatusDot({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[0.8125rem] text-ink-2", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_CLASSES[tone].dot)} />
      {children}
    </span>
  );
}
