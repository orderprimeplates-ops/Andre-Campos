"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Download, ExternalLink, FileText, Loader2, Send, Share2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { ALL_SECTIONS, BRIEF_SECTIONS, buildStaffBrief, type BriefSectionKey, type StaffBriefSource } from "@/lib/staff-brief";
import { saveStaffNotes } from "@/app/(app)/events/actions/brief";

type Ready = { file: File; url: string };

/**
 * Day-of "Share With Staff": choose sections → preview exactly what staff get → create the PDF →
 * share it through the phone's share sheet (Messages, WhatsApp…) or download it.
 * The PDF is created first and shared on a second tap, because phones only open the share sheet
 * directly from a tap.
 */
export function ShareWithStaff({ eventId, source }: { eventId: string; source: StaffBriefSource }) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<BriefSectionKey[]>(ALL_SECTIONS);
  const [notes, setNotes] = useState(source.staffNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(source.staffNotes ?? "");
  const [ready, setReady] = useState<Ready | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [canShare, setCanShare] = useState(false);

  const brief = useMemo(() => buildStaffBrief({ ...source, staffNotes: notes }, sections), [source, notes, sections]);

  useEffect(() => () => { if (ready) URL.revokeObjectURL(ready.url); }, [ready]);

  function toggle(k: BriefSectionKey) {
    setReady(null);
    setSections((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : ALL_SECTIONS.filter((x) => x === k || cur.includes(x))));
  }

  function createPdf() {
    setError(null);
    start(async () => {
      try {
        if (notes.trim() !== savedNotes.trim()) {
          await saveStaffNotes(eventId, notes);
          setSavedNotes(notes);
        }
        const res = await fetch(`/events/${eventId}/staff-brief?sections=${sections.join(",")}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const name = (res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]) ?? "Staff Brief.pdf";
        const file = new File([blob], name, { type: "application/pdf" });
        setCanShare(typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] }));
        setReady({ file, url: URL.createObjectURL(blob) });
      } catch {
        setError("The PDF couldn’t be created. Check your connection and try again.");
      }
    });
  }

  async function share() {
    if (!ready) return;
    try {
      await navigator.share({ files: [ready.file], title: ready.file.name.replace(/\.pdf$/, "") });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Sharing isn’t available here — download the PDF and attach it instead.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setReady(null); setOpen(true); }} className="flex items-center gap-1.5 rounded-full bg-wine-soft px-3 py-2 text-xs font-medium text-wine hover:bg-wine/10" aria-label="Share with staff">
        <Send className="h-4 w-4" /><span className="sm:hidden">Share</span><span className="hidden sm:inline">Share with staff</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} wide title="Share with staff" description="A clean event brief for your team — prices, payments, costs and pay rates are never included.">
        {ready ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-sage-soft/70 px-4 py-3.5">
              <FileText className="h-8 w-8 shrink-0 text-sage" />
              <div className="min-w-0">
                <div className="truncate font-medium">{ready.file.name}</div>
                <div className="text-xs text-ink-3">{sections.length} section{sections.length === 1 ? "" : "s"} · {Math.max(1, Math.round(ready.file.size / 1024))} KB · ready to send</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {canShare && <Button variant="wine" onClick={share} className="sm:col-span-3"><Share2 className="h-4 w-4" />Share PDF (Messages, WhatsApp…)</Button>}
              <a href={ready.url} download={ready.file.name} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong/70 bg-white/70 px-4 text-sm font-medium text-ink-2 hover:bg-sand"><Download className="h-4 w-4" />Download PDF</a>
              <a href={ready.url} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong/70 bg-white/70 px-4 text-sm font-medium text-ink-2 hover:bg-sand"><ExternalLink className="h-4 w-4" />Open PDF</a>
              <Button variant="ghost" onClick={() => setReady(null)}><ArrowLeft className="h-4 w-4" />Change sections</Button>
            </div>
            {!canShare && <p className="text-xs text-ink-3">This browser can’t open the share sheet with a file. Download the PDF, then attach it in Messages or email.</p>}
            {error && <p className="text-sm text-clay">{error}</p>}
          </div>
        ) : (
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-[0.8125rem] font-medium text-ink-2">Include</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {BRIEF_SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm text-ink-2">
                    <input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggle(s.key)} className="h-4 w-4 accent-[var(--color-wine)]" />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>

            {sections.includes("notes") && (
              <div>
                <label htmlFor="staffNotes" className="mb-1.5 block text-[0.8125rem] font-medium text-ink-2">Setup &amp; service notes for staff <span className="font-normal text-ink-4">saved to this event</span></label>
                <Textarea id="staffNotes" rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setReady(null); }} placeholder={"Buffet on the kitchen island, hot items left to right\nGarnish entrée with micro herbs right before it leaves\nRefill water every 15 minutes"} />
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.8125rem] font-medium text-ink-2">Preview — exactly what staff receive</span>
                <span className="flex items-center gap-1 text-xs text-sage"><ShieldCheck className="h-3.5 w-3.5" />No financial info</span>
              </div>
              <BriefPreview brief={brief} />
            </div>

            {error && <p className="text-sm text-clay">{error}</p>}
            <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-line bg-linen px-6 pt-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="wine" onClick={createPdf} disabled={pending || sections.length === 0}>
                {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Creating PDF…</> : <><FileText className="h-4 w-4" />Create PDF</>}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

/** Mirrors the PDF layout so the preview matches what's sent. */
function BriefPreview({ brief }: { brief: ReturnType<typeof buildStaffBrief> }) {
  return (
    <div className="max-h-[50dvh] overflow-y-auto rounded-2xl border border-line bg-white px-5 py-4 text-[0.8125rem] leading-snug text-ink shadow-inner">
      <div className="flex items-center justify-between border-b border-line pb-1.5 text-[0.6875rem] uppercase tracking-[0.14em]">
        <span className="font-display font-semibold text-wine">Prime Plates</span><span className="text-ink-3">Staff Event Brief</span>
      </div>
      <div className="mt-3 font-display text-2xl leading-tight">{brief.title}</div>
      <div className="mt-1 font-semibold text-wine">{brief.dateLabel}</div>
      <div className="text-ink-2">{brief.subtitle}</div>
      {brief.critical.length > 0 && (
        <div className="mt-3 border-l-[3px] border-clay bg-clay-soft px-3 py-2">
          <div className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-clay">Critical — read first</div>
          {brief.critical.map((c) => <div key={c} className="font-semibold">{c}</div>)}
        </div>
      )}
      {brief.sections.map((sec) => (
        <section key={sec.key} className="mt-4">
          <h3 className="border-b border-champagne pb-0.5 font-display text-lg text-wine">{sec.title}</h3>
          {sec.facts && (
            <dl className="mt-1">
              {sec.facts.map(([k, v]) => <div key={k} className="flex gap-3 border-b border-sand py-1"><dt className="w-28 shrink-0 text-ink-3">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
            </dl>
          )}
          {sec.blocks.map((b, i) => (
            <div key={i}>
              {b.heading && <div className="mt-2 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-ink-3">{b.heading}</div>}
              <ul>
                {b.lines.map((l, j) => (
                  <li key={j} className="flex gap-2 py-1">
                    {l.check && <span className="mt-0.5 h-3 w-3 shrink-0 border border-ink-2" />}
                    {l.time !== undefined && <span className="w-16 shrink-0 font-semibold text-wine">{l.time}</span>}
                    <span className="min-w-0">
                      <span className="font-semibold">{l.title}</span>
                      {l.detail?.map((d, k) => <span key={k} className={cn("block text-ink-2")}>{d}</span>)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      {brief.sections.length === 0 && <p className="mt-4 text-ink-3">Choose at least one section.</p>}
    </div>
  );
}
