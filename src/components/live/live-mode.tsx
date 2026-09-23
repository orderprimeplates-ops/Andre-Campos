"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bell, Check, ChevronLeft, Flame, KeyRound, MapPin, Pause, Phone, Play, Plus, Sun, Timer, TriangleAlert, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatTime, minutesOf, nowTimeIn } from "@/lib/domain/dates";
import { STAFF_ROLE } from "@/lib/status";
import { toggleRunLine } from "@/app/(app)/events/actions/prep";

interface LiveData {
  id: string;
  name: string;
  clientName: string;
  date: string;
  isToday: boolean;
  timezone: string;
  guestCount: number;
  arrivalTime: string | null;
  serviceTime: string | null;
  endTime: string | null;
  criticalNotes: string | null;
  dietarySummary: string | null;
  allergies: string[];
  venue: { name: string; address: string; gateCode: string | null; parking: string | null; contactName: string | null; contactPhone: string | null; oven: string | null; electrical: string | null } | null;
  run: { id: string; time: string; title: string; kind: string; lines: string[]; doneLines: number[]; done: boolean }[];
  courses: { name: string; fireTime: string | null; dishes: string[] }[];
  staff: { name: string; role: string; callTime: string | null; phone: string | null; status: string }[];
}

interface KitchenTimer { id: number; label: string; endsAt: number; total: number; paused?: number }

const KIND_ACCENT: Record<string, string> = {
  ARRIVAL: "border-l-slate", TASK: "border-l-line-strong", FIRE: "border-l-amber", SERVICE: "border-l-wine", BREAKDOWN: "border-l-ink-4", DEPARTURE: "border-l-sage",
};

function useNow(timezone: string) {
  const [now, setNow] = useState(() => ({ time: nowTimeIn(timezone), secs: new Date().getSeconds(), ts: Date.now() }));
  useEffect(() => {
    const t = setInterval(() => setNow({ time: nowTimeIn(timezone), secs: new Date().getSeconds(), ts: Date.now() }), 1000);
    return () => clearInterval(t);
  }, [timezone]);
  return now;
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.25, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    /* audio not available */
  }
}

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function LiveMode({ data }: { data: LiveData }) {
  const now = useNow(data.timezone);
  const nowMin = minutesOf(now.time) ?? 0;
  const [run, setRun] = useState(data.run);
  const [, start] = useTransition();
  const [awake, setAwake] = useState(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [timers, setTimers] = useState<KitchenTimer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fired = useRef(new Set<number>());

  // Timers are a per-device convenience, so they live in this browser only.
  useEffect(() => {
    let saved: KitchenTimer[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(`pp-timers-${data.id}`) ?? "[]");
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from device storage after mount
    setTimers(saved);
    setLoaded(true);
  }, [data.id]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(`pp-timers-${data.id}`, JSON.stringify(timers));
    } catch {
      /* storage unavailable */
    }
  }, [timers, data.id, loaded]);

  useEffect(() => {
    for (const t of timers) {
      if (!t.paused && t.endsAt <= now.ts && !fired.current.has(t.id)) {
        fired.current.add(t.id);
        beep();
      }
    }
  }, [now.ts, timers]);

  async function toggleAwake() {
    try {
      if (awake) {
        await wakeRef.current?.release();
        wakeRef.current = null;
        setAwake(false);
      } else {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        wakeRef.current = (await nav.wakeLock?.request("screen")) ?? null;
        setAwake(!!wakeRef.current);
      }
    } catch {
      setAwake(false);
    }
  }

  const upcoming = useMemo(() => run.filter((r) => !r.done), [run]);
  // "Now" is the latest unfinished block that has started; "next" is the first one after it.
  const current = [...upcoming].reverse().find((r) => (minutesOf(r.time) ?? 0) <= nowMin) ?? null;
  const next = upcoming.find((r) => r !== current && (minutesOf(r.time) ?? 0) > nowMin) ?? upcoming.find((r) => r !== current) ?? null;
  const nextFire = data.courses.filter((c) => c.fireTime).find((c) => (minutesOf(c.fireTime!) ?? 0) >= nowMin);

  function toggle(itemId: string, line: number | null) {
    setRun((rs) =>
      rs.map((r) => {
        if (r.id !== itemId) return r;
        if (line === null) {
          const done = !r.done;
          return { ...r, done, doneLines: done ? r.lines.map((_, i) => i) : [] };
        }
        const set = new Set(r.doneLines);
        if (set.has(line)) set.delete(line);
        else set.add(line);
        return { ...r, doneLines: [...set], done: r.lines.length > 0 && set.size >= r.lines.length };
      }),
    );
    start(() => toggleRunLine(itemId, line));
  }

  // Timer start times come from the clock tick (not Date.now during render) to keep render pure.
  function addTimer(minutes: number, label: string) {
    const startedAt = now.ts;
    setTimers((t) => [...t, { id: startedAt + t.length, label, endsAt: startedAt + minutes * 60_000, total: minutes * 60_000 }]);
  }

  return (
    <div className="min-h-dvh bg-ivory pb-16">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ivory/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href={`/events/${data.id}`} className="-ml-2 rounded-full p-2 text-ink-3 hover:bg-sand" aria-label="Exit day-of mode"><ChevronLeft className="h-6 w-6" /></Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-xl leading-tight sm:text-2xl">{data.name}</div>
            <div className="text-xs text-ink-3">
              {data.guestCount} guests · service {formatTime(data.serviceTime)}{!data.isToday && " · not today (preview)"}
            </div>
          </div>
          <button type="button" onClick={toggleAwake} aria-label={awake ? "Screen stays on" : "Keep screen awake"} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium", awake ? "bg-champagne-soft text-[#8a6a35]" : "text-ink-3 hover:bg-sand")}>
            <Sun className="h-4 w-4" /><span className="hidden sm:inline">{awake ? "Screen on" : "Keep awake"}</span>
          </button>
          <div className="text-right">
            <div suppressHydrationWarning className="font-display text-[1.9rem] leading-none tabular sm:text-[2.6rem]">{formatTime(now.time).replace(/ (AM|PM)/, "")}<span className="hidden text-lg text-ink-4 sm:inline">:{String(now.secs).padStart(2, "0")}</span></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 pt-5 sm:px-8">
        {(data.allergies.length > 0 || data.criticalNotes) && (
          <section className="rounded-3xl border-2 border-clay/30 bg-clay-soft/70 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-clay"><TriangleAlert className="h-5 w-5" />Critical</div>
            {data.allergies.map((a) => <div key={a} className="mt-1 text-xl font-semibold text-ink sm:text-2xl">{a}</div>)}
            {data.criticalNotes && <p className="mt-2 whitespace-pre-line text-lg leading-snug text-ink">{data.criticalNotes}</p>}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-espresso p-5 text-linen shadow-[var(--shadow-lift)]">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-champagne">{current ? "Now" : "Up next"}</div>
            {(current ?? next) ? (
              <>
                <div className="mt-1 font-display text-[2.4rem] leading-tight">{(current ?? next)!.title}</div>
                <div className="text-lg text-linen/70">{formatTime((current ?? next)!.time)}</div>
              </>
            ) : (
              <div className="mt-1 font-display text-3xl">All done — beautiful work.</div>
            )}
            {current && next && (
              <div className="mt-4 border-t border-linen/15 pt-3 text-linen/80">
                <span className="text-xs uppercase tracking-[0.2em] text-champagne">Next · {formatTime(next.time)}</span>
                <div className="text-xl">{next.title}</div>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-line bg-linen p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber"><Flame className="h-4 w-4" />Fire times</div>
            <ul className="mt-2 space-y-1.5">
              {data.courses.map((c) => {
                const m = c.fireTime ? minutesOf(c.fireTime)! : null;
                const past = m !== null && m < nowMin;
                const isNext = nextFire?.name === c.name;
                return (
                  <li key={c.name} className={cn("flex items-baseline justify-between gap-3", past && "text-ink-4", isNext && "text-ink")}>
                    <span className={cn("text-lg", isNext && "font-semibold")}>{c.name}</span>
                    <span className="tabular">
                      {c.fireTime ? formatTime(c.fireTime) : "—"}
                      {isNext && data.isToday && m !== null && <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-sm font-semibold text-amber">in {m - nowMin} min</span>}
                    </span>
                  </li>
                );
              })}
              {data.courses.length === 0 && <li className="text-ink-3">No courses on the menu.</li>}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-linen p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-ink-2"><Timer className="h-4 w-4" />Timers</div>
            <div className="flex flex-wrap gap-1.5">
              {[5, 10, 15, 20, 45].map((m) => (
                <button key={m} type="button" onClick={() => addTimer(m, `${m} min`)} className="rounded-full border border-line bg-ivory px-3 py-1.5 text-sm font-medium active:bg-sand">
                  <Plus className="mr-0.5 inline h-3 w-3" />{m}m
                </button>
              ))}
            </div>
          </div>
          {timers.length === 0 ? (
            <p className="text-sm text-ink-4">Tap a time to start a timer. It keeps running if you switch screens.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {timers.map((t) => {
                const left = t.paused ?? t.endsAt - now.ts;
                const doneT = left <= 0;
                return (
                  <div key={t.id} className={cn("relative rounded-2xl border px-3 py-3", doneT ? "animate-pulse border-clay bg-clay-soft" : "border-line bg-ivory")}>
                    <input
                      defaultValue={t.label}
                      onBlur={(e) => setTimers((ts) => ts.map((x) => (x.id === t.id ? { ...x, label: e.target.value } : x)))}
                      className="w-full bg-transparent text-xs text-ink-3 focus:outline-none"
                      aria-label="Timer label"
                    />
                    <div className={cn("font-display text-4xl tabular", doneT && "text-clay")}>{doneT ? "Done" : fmtCountdown(left)}</div>
                    <div className="mt-1 flex gap-1">
                      {!doneT && (
                        <button type="button" className="rounded-lg p-1.5 text-ink-3 active:bg-sand" aria-label={t.paused ? "Resume" : "Pause"}
                          onClick={() => setTimers((ts) => ts.map((x) => (x.id !== t.id ? x : x.paused ? { ...x, endsAt: Date.now() + x.paused, paused: undefined } : { ...x, paused: x.endsAt - Date.now() })))}>
                          {t.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        </button>
                      )}
                      <button type="button" className="rounded-lg p-1.5 text-ink-3 active:bg-sand" aria-label="Dismiss timer" onClick={() => setTimers((ts) => ts.filter((x) => x.id !== t.id))}>
                        {doneT ? <Bell className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-[0.16em] text-ink-2">Timeline</h2>
          {run.length === 0 && (
            <p className="rounded-3xl border border-dashed border-line-strong/60 px-5 py-8 text-center text-ink-3">
              No timeline yet — draft one from the event’s Prep tab.
            </p>
          )}
          <ol className="space-y-3">
            {run.map((r) => {
              const isNow = r === current;
              const passed = (minutesOf(r.time) ?? 0) < nowMin && !r.done && !isNow && data.isToday;
              return (
                <li key={r.id} className={cn("rounded-3xl border border-l-[6px] bg-linen transition-all", KIND_ACCENT[r.kind], isNow ? "border-wine/30 shadow-[var(--shadow-lift)] ring-2 ring-wine/15" : "border-line", r.done && "opacity-55")}>
                  <button type="button" onClick={() => toggle(r.id, null)} className="flex w-full items-center gap-4 px-5 pt-4 text-left">
                    <span className="w-[5.5rem] shrink-0 whitespace-nowrap font-display text-[1.6rem] leading-none tabular sm:w-28 sm:text-[1.9rem]">{formatTime(r.time)}</span>
                    <span className={cn("flex-1 text-[1.35rem] font-semibold leading-tight", r.done && "line-through decoration-2")}>{r.title}</span>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2", r.done ? "border-sage bg-sage text-linen" : passed ? "border-amber" : "border-line-strong")}>
                      {r.done && <Check className="h-6 w-6" strokeWidth={3} />}
                    </span>
                  </button>
                  <ul className="px-5 pb-4 pt-2">
                    {r.lines.map((l, i) => {
                      const done = r.doneLines.includes(i);
                      return (
                        <li key={i}>
                          <button type="button" onClick={() => toggle(r.id, i)} className="flex w-full items-center gap-3 py-2 text-left sm:pl-32">
                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2", done ? "border-sage bg-sage text-linen" : "border-line-strong")}>
                              {done && <Check className="h-4 w-4" strokeWidth={3} />}
                            </span>
                            <span className={cn("text-lg", done ? "text-ink-4 line-through" : "text-ink")}>{l}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-linen p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-ink-2"><Users className="h-4 w-4" />Team</div>
            <ul className="divide-y divide-line/70">
              {data.staff.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-lg font-medium">{s.name}</div>
                    <div className="text-sm text-ink-3">{STAFF_ROLE[s.role]}{s.callTime ? ` · call ${formatTime(s.callTime)}` : ""}</div>
                  </div>
                  {s.phone && <a href={`tel:${s.phone}`} className="flex h-11 w-11 items-center justify-center rounded-full bg-sage-soft text-sage" aria-label={`Call ${s.name}`}><Phone className="h-5 w-5" /></a>}
                </li>
              ))}
              {data.staff.length === 0 && <li className="py-2 text-ink-3">Just you tonight.</li>}
            </ul>
          </div>
          {data.venue && (
            <div className="rounded-3xl border border-line bg-linen p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-ink-2"><MapPin className="h-4 w-4" />{data.venue.name}</div>
              <div className="space-y-1.5 text-[1.05rem]">
                {data.venue.address && <p>{data.venue.address}</p>}
                {data.venue.gateCode && <p className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4 text-ink-3" />Gate {data.venue.gateCode}</p>}
                {data.venue.parking && <p className="text-ink-2">{data.venue.parking}</p>}
                {data.venue.oven && <p className="text-ink-2">Oven: {data.venue.oven}</p>}
                {data.venue.electrical && <p className="text-clay">⚡ {data.venue.electrical}</p>}
                {data.venue.contactPhone && <a href={`tel:${data.venue.contactPhone}`} className="inline-flex items-center gap-2 font-medium text-wine"><Phone className="h-4 w-4" />{data.venue.contactName ?? "Host"}</a>}
              </div>
            </div>
          )}
        </section>
        {data.dietarySummary && <p className="rounded-3xl bg-sand/60 px-5 py-4 text-lg text-ink-2">{data.dietarySummary}</p>}
      </main>
    </div>
  );
}
