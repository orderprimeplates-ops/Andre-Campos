import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { PrintButton } from "@/components/ui/print-button";

export const metadata = { title: "Menu" };

/** The client-facing menu: dish names and descriptions only — no costs, notes or recipes. */
export default async function MenuCardPage({ params }: PageProps<"/events/[id]/menu-card">) {
  const { id } = await params;
  const [e, settings] = await Promise.all([
    db.event.findUnique({
      where: { id },
      include: { client: { select: { name: true } }, menu: { include: { courses: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" }, include: { dish: { select: { name: true, description: true, dietaryTags: true } } } } } } } } },
    }),
    getSettings(),
  ]);
  if (!e) notFound();
  const courses = (e.menu?.courses ?? []).filter((c) => c.items.length);
  return (
    <div className="min-h-dvh bg-sand/40 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-2xl items-center justify-between px-4">
        <Link href={`/events/${id}?tab=menu`} className="inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink"><ChevronLeft className="h-4 w-4" />Back to menu</Link>
        <PrintButton />
      </div>
      <article className="mx-auto max-w-2xl bg-linen px-8 py-14 text-center shadow-[var(--shadow-lift)] sm:px-16 print:max-w-none print:shadow-none">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.36em] text-champagne">{settings.businessName}</div>
        <div className="mx-auto my-6 h-px w-16 bg-champagne/60" />
        <h1 className="font-display text-[2.6rem] italic leading-tight text-ink">{e.menu?.title ?? e.name}</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-ink-3">{formatDate.long(toISODate(e.date))}</p>
        <div className="mt-12 space-y-10">
          {courses.map((c) => (
            <section key={c.id}>
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.32em] text-wine">{c.name}</h2>
              <div className="mt-4 space-y-5">
                {c.items.map((i) => (
                  <div key={i.id}>
                    <div className="font-display text-[1.6rem] leading-snug text-ink">{i.dish.name}</div>
                    {i.dish.description && <p className="mx-auto mt-1 max-w-md text-[0.95rem] italic leading-relaxed text-ink-2">{i.dish.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {courses.length === 0 && <p className="text-ink-3">The menu is still being written.</p>}
        </div>
        {e.menu?.clientNotes && <p className="mx-auto mt-12 max-w-md text-sm italic text-ink-3">{e.menu.clientNotes}</p>}
        <div className="mx-auto mt-14 h-px w-16 bg-champagne/60" />
        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-ink-4">Prepared for {e.client.name}</p>
      </article>
    </div>
  );
}
