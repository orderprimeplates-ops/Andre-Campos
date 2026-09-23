import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "wine" | "danger" | "quiet";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-espresso text-linen hover:bg-ink shadow-[0_1px_0_rgb(255_255_255/0.08)_inset,0_1px_2px_rgb(42_33_29/0.2)]",
  wine: "bg-wine text-linen hover:bg-wine-deep shadow-[0_1px_2px_rgb(94_31_43/0.25)]",
  secondary: "bg-linen text-ink border border-line-strong/70 hover:border-ink-4 hover:bg-white",
  ghost: "text-ink-2 hover:bg-sand hover:text-ink",
  quiet: "bg-sand text-ink-2 hover:bg-parchment hover:text-ink",
  danger: "text-clay hover:bg-clay-soft",
};
const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[0.9375rem] gap-2 rounded-xl",
  icon: "h-9 w-9 rounded-xl justify-center",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-200 ease-[var(--ease-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  href,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...rest} />;
}
