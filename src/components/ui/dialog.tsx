"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Accessible modal built on <dialog>. On phones it becomes a bottom sheet.
 * Controlled via `open`/`onClose`.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[1.5rem] bg-linen p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/30 backdrop:backdrop-blur-[2px] open:animate-sheet-up",
        "sm:m-auto sm:max-h-[88dvh] sm:rounded-[1.5rem]",
        wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col sm:max-h-[88dvh]">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
            <div>
              <h2 className="font-display text-2xl leading-tight">{title}</h2>
              {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-3 transition-colors hover:bg-sand hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5 pb-safe">{children}</div>
        </div>
      )}
    </dialog>
  );
}
