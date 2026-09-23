import Link from "next/link";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = sp.sort === "spend" || sp.sort === "recent" ? sp.sort : "name";
  const { today } = await getToday();
  const contains = { contains: q, mode: "insensitive" as const };
  const rows = await db.client.findMany({
    where: q ? { OR: [{ name: contains }, { company: contains }, { email: contains }, { phone: contains }] } : {},
    include: { events: { select: { date: true, status: true, payments: { select: { kind: true, amountCents: true } } } } },
    orderBy: { name: "asc" },
  });
  const clients = rows.map((c) => {
    const events = c.events.filter((e) => e.status !== "CANCELLED");
    const dates = events.map((e) => toISODate(e.date)).sort();
    return {
      ...c,
      eventCount: events.length,
      spend: events.flatMap((e) => e.payments).filter((p) => p.kind !== "TIP").reduce((s, p) => s + p.amountCents, 0),
      last: dates.filter((d) => d < today).at(-1) ?? null,
      next: dates.find((d) => d >= today) ?? null,
    };
  });
  if (sort === "spend") clients.sort((a, b) => b.spend - a.spend);
  if (sort === "recent") clients.sort((a, b) => (b.next ?? b.last ?? "").localeCompare(a.next ?? a.last ?? ""));
  const total = clients.reduce((s, c) => s + c.spend, 0);
  const href = (s: string) => `/clients?sort=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        description={`${clients.length} clients · ${formatMoney(total)} collected all-time`}
        actions={<ButtonLink href="/clients/new" variant="primary"><Plus className="h-4 w-4" />New client</ButtonLink>}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input name="q" defaultValue={q} placeholder="Search clients…" className="h-11 w-full rounded-xl border border-line-strong/60 bg-white/70 pl-10 pr-3 text-[0.9375rem] placeholder:text-ink-4 focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10" />
          <input type="hidden" name="sort" value={sort} />
        </form>
        <Segmented active={sort} options={[{ key: "name", label: "A–Z", href: href("name") }, { key: "recent", label: "Upcoming", href: href("recent") }, { key: "spend", label: "Top spend", href: href("spend") }]} />
      </div>
      {clients.length === 0 ? (
        <EmptyState title={q ? "No matches" : "No clients yet"}>{q ? `Nothing matches “${q}”.` : "Clients are created when you convert a lead, or add one directly."}</EmptyState>
      ) : (
        <Card className="divide-y divide-line/70 overflow-hidden">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-sand/40 sm:px-6">
              <Avatar name={c.name} tone={c.next ? "wine" : "neutral"} className="h-11 w-11 text-base" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-ink">{c.name}</span>
                  {c.allergies && <span title={`Allergies: ${c.allergies}`}><TriangleAlert className="h-3.5 w-3.5 text-clay" /></span>}
                </div>
                <div className="truncate text-[0.8125rem] text-ink-3">{[c.company, c.phone, c.email].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="hidden w-36 text-right md:block">
                <div className="text-xs text-ink-3">{c.next ? "Next event" : "Last event"}</div>
                <div className={`text-sm ${c.next ? "text-wine" : "text-ink-2"}`}>{c.next ? formatDate.medium(c.next) : c.last ? formatDate.medium(c.last) : "—"}</div>
              </div>
              <div className="hidden w-20 text-right sm:block">
                <div className="text-xs text-ink-3">Events</div>
                <div className="text-sm tabular text-ink-2">{c.eventCount}</div>
              </div>
              <div className="w-24 text-right">
                <div className="text-xs text-ink-3">Lifetime</div>
                <div className="font-display text-lg tabular text-ink">{formatMoney(c.spend)}</div>
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
