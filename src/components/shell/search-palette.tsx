"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, CalendarDays, Contact, Inbox, Loader2, MapPin, Search, Sparkles, UsersRound, UtensilsCrossed, Wheat, X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { search } from "@/app/(app)/search-action";
import type { SearchKind, SearchResult } from "@/lib/server/search";

const OPEN_EVENT = "pp:open-search";
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const KIND: Record<SearchKind, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  event: { label: "Events", icon: Sparkles },
  client: { label: "Clients", icon: Contact },
  lead: { label: "Leads", icon: Inbox },
  dish: { label: "Dishes", icon: UtensilsCrossed },
  recipe: { label: "Recipes", icon: BookOpen },
  ingredient: { label: "Ingredients", icon: Wheat },
  staff: { label: "Staff", icon: UsersRound },
  venue: { label: "Venues", icon: MapPin },
};

const SUGGESTIONS = ["Ciara", "Sea Bass", "Wedding", "Asparagus", "Marisol"];

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function runSearch(value: string) {
    setQ(value);
    setActive(0);
    const id = ++seq.current;
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const r = await search(value);
      if (id === seq.current) setResults(r);
    });
  }

  function close() {
    setOpen(false);
    setQ("");
    setResults([]);
  }

  function go(r: SearchResult) {
    close();
    router.push(r.href);
  }

  if (!open) return null;

  const groups = Object.keys(KIND)
    .map((k) => ({ kind: k as SearchKind, items: results.filter((r) => r.kind === k) }))
    .filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 animate-fade-in bg-ink/25 backdrop-blur-[3px]" onClick={close} />
      <div className="relative mx-auto flex h-full max-w-2xl flex-col sm:h-auto sm:pt-[12vh]">
        <div className="flex max-h-full animate-sheet-up flex-col overflow-hidden bg-linen shadow-[var(--shadow-pop)] sm:max-h-[70vh] sm:rounded-[1.5rem] sm:border sm:border-line">
          <div className="flex items-center gap-3 border-b border-line px-5 pb-3 pt-[max(env(safe-area-inset-top),0.875rem)] sm:pt-3.5">
            {pending ? <Loader2 className="h-5 w-5 animate-spin text-ink-3" /> : <Search className="h-5 w-5 text-ink-3" strokeWidth={1.75} />}
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => runSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                if (e.key === "Enter" && flat[active]) go(flat[active]);
              }}
              placeholder="Search clients, events, dishes, recipes, dates…"
              className="h-10 flex-1 bg-transparent text-[1.0625rem] text-ink placeholder:text-ink-4 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={close} className="rounded-full p-1.5 text-ink-3 hover:bg-sand" aria-label="Close search">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {q.trim().length < 2 ? (
              <div className="px-3 py-6">
                <div className="eyebrow mb-3">Try</div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => runSearch(s)} className="rounded-full border border-line bg-ivory px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
                      {s}
                    </button>
                  ))}
                  <button type="button" onClick={() => runSearch("Oct 3")} className="flex items-center gap-1.5 rounded-full border border-line bg-ivory px-3 py-1.5 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
                    <CalendarDays className="h-3.5 w-3.5" /> Oct 3
                  </button>
                </div>
              </div>
            ) : flat.length === 0 && !pending ? (
              <div className="px-3 py-10 text-center text-sm text-ink-3">Nothing found for “{q}”.</div>
            ) : (
              groups.map((g) => {
                const meta = KIND[g.kind];
                return (
                  <div key={g.kind} className="mb-1">
                    <div className="eyebrow px-3 pb-1 pt-3">{meta.label}</div>
                    {g.items.map((r) => {
                      const idx = flat.indexOf(r);
                      const Icon = meta.icon;
                      return (
                        <button
                          key={`${r.kind}-${r.id}`}
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => go(r)}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", idx === active ? "bg-sand" : "hover:bg-sand/60")}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-ivory text-ink-3">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem] text-ink">{r.title}</span>
                            <span className="block truncate text-xs text-ink-3">{r.subtitle}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-[0.6875rem] text-ink-4 sm:flex">
            <span>↑↓ to move</span><span>↵ to open</span><span>esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
