import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line-strong/60 bg-white/70 px-3.5 text-[0.9375rem] text-ink placeholder:text-ink-4 transition-colors duration-150 hover:border-line-strong focus:border-wine/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-wine/10 disabled:opacity-60";

export function Label({ children, htmlFor, hint, className }: { children: React.ReactNode; htmlFor?: string; hint?: React.ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 flex items-baseline justify-between gap-2 text-[0.8125rem] font-medium text-ink-2", className)}>
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-ink-4">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(control, "py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(control, "h-11 appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  name,
  hint,
  className,
  children,
}: {
  label: string;
  name?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={name} hint={hint}>
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Text input with a leading "$". Values are dollars; the server converts to cents. */
export function MoneyInput({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">$</span>
      <input inputMode="decimal" className={cn(control, "h-11 pl-7 tabular", className)} {...rest} />
    </div>
  );
}

/** Tri-state yes / no / unknown for kitchen checklist style questions. */
export function YesNoUnknown({ name, defaultValue }: { name: string; defaultValue: boolean | null | undefined }) {
  const v = defaultValue === true ? "yes" : defaultValue === false ? "no" : "";
  return (
    <div className="inline-flex rounded-xl border border-line-strong/60 bg-white/70 p-0.5">
      {[
        ["yes", "Yes"],
        ["no", "No"],
        ["", "Unknown"],
      ].map(([value, label]) => (
        <label key={value} className="cursor-pointer">
          <input type="radio" name={name} value={value} defaultChecked={v === value} className="peer sr-only" />
          <span className="block rounded-[0.6rem] px-3 py-1.5 text-[0.8125rem] text-ink-3 transition-colors peer-checked:bg-espresso peer-checked:text-linen peer-focus-visible:ring-2 peer-focus-visible:ring-wine/30">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl bg-clay-soft px-3.5 py-2.5 text-sm text-clay">{message}</p>;
}
