import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { dishInclude, menuItemCount, toDishInput } from "@/lib/mappers";
import { dishCostPerServing } from "@/lib/domain/culinary";
import { formatDate, fromISODate, toISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { COURSE, EVENT_TYPE, HOLDING, LEVEL, MENU_STATUS, SERVICE_STYLE, metaOf } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Menus & Dishes" };

/** Which service styles suit each event type — powers the "event type" filter. */
const EVENT_STYLES: Record<string, string[]> = {
  PRIVATE_DINNER: ["PLATED", "FAMILY_STYLE"], PLATED_DINNER: ["PLATED"], FAMILY_STYLE: ["FAMILY_STYLE"], BUFFET: ["BUFFET", "STATIONS"],
  BRUNCH: ["FAMILY_STYLE", "BUFFET"], COCKTAIL: ["PASSED", "STATIONS"], WEDDING: ["BUFFET", "PASSED", "STATIONS", "PLATED"],
  CORPORATE: ["BUFFET", "DROP_OFF"], COOKING_CLASS: ["INTERACTIVE"], VACATION_CHEF: ["FAMILY_STYLE", "PLATED"], DROP_OFF: ["DROP_OFF"], OTHER: [],
};
const HOLD_RANK: Record<string, number> = { POOR: 0, FAIR: 1, GOOD: 2, EXCELLENT: 3 };

function Filter({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[0.6875rem] font-medium text-ink-3">{label}</span>
      <select name={name} defaultValue={value} className="h-9 rounded-lg border border-line-strong/60 bg-white/70 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine/20">
        <option value="">Any</option>
        {options.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </label>
  );
}

export default async function DishesPage({ searchParams }: PageProps<"/dishes">) {
  const sp = await searchParams;
  const p = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const view = p("view") === "menus" ? "menus" : "library";

  if (view === "menus") return <EventMenus />;

  const dishes = await db.dish.findMany({ where: { inLibrary: true, archived: p("archived") === "1" }, include: dishInclude, orderBy: { name: "asc" } });
  const withCost = dishes.map((d) => ({ d, cost: Math.round(dishCostPerServing(toDishInput(d)).cents) }));
  const proteins = [...new Set(dishes.map((d) => d.protein).filter(Boolean))] as string[];
  const cuisines = [...new Set(dishes.map((d) => d.cuisine).filter(Boolean))] as string[];
  const tags = [...new Set(dishes.flatMap((d) => d.dietaryTags))].sort();
  const maxCost = Number(p("maxCost")) || null;

  const filtered = withCost.filter(({ d, cost }) =>
    (!p("course") || d.course === p("course")) &&
    (!p("protein") || d.protein === p("protein")) &&
    (!p("cuisine") || d.cuisine === p("cuisine")) &&
    (!p("dietary") || d.dietaryTags.includes(p("dietary"))) &&
    (!p("style") || d.serviceStyles.includes(p("style") as never)) &&
    (!p("eventType") || d.serviceStyles.some((s) => EVENT_STYLES[p("eventType")]?.includes(s))) &&
    (!p("difficulty") || d.difficulty === p("difficulty")) &&
    (!p("holding") || HOLD_RANK[d.holdingQuality] >= HOLD_RANK[p("holding")]) &&
    (!maxCost || cost <= maxCost * 100),
  );
  const courses = Object.keys(COURSE).filter((c) => filtered.some(({ d }) => d.course === c));
  const active = ["course", "protein", "cuisine", "dietary", "style", "eventType", "difficulty", "holding", "maxCost"].filter((k) => p(k)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Dish Library"
        description="Finished plates your guests experience — each built from recipes, each costed live."
        actions={
          <>
            <Segmented active={view} options={[{ key: "library", label: "Dish Library", href: "/dishes" }, { key: "menus", label: "Event menus", href: "/dishes?view=menus" }]} />
            <ButtonLink href="/dishes/new" variant="primary"><Plus className="h-4 w-4" />New dish</ButtonLink>
          </>
        }
      />
      <details className="group mb-6 rounded-2xl border border-line bg-linen" open={active > 0}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink-2">
          <SlidersHorizontal className="h-4 w-4" />Filters{active ? ` · ${active} active` : ""}
          {active > 0 && <Link href="/dishes" className="ml-auto text-xs text-wine hover:underline">Clear</Link>}
        </summary>
        <form className="grid grid-cols-2 gap-3 border-t border-line px-4 py-4 sm:grid-cols-3 lg:grid-cols-5">
          <Filter name="course" label="Course" value={p("course")} options={Object.entries(COURSE)} />
          <Filter name="protein" label="Protein" value={p("protein")} options={proteins.map((x) => [x, x])} />
          <Filter name="cuisine" label="Cuisine" value={p("cuisine")} options={cuisines.map((x) => [x, x])} />
          <Filter name="dietary" label="Dietary" value={p("dietary")} options={tags.map((x) => [x, x])} />
          <Filter name="style" label="Service style" value={p("style")} options={Object.entries(SERVICE_STYLE)} />
          <Filter name="eventType" label="Event type" value={p("eventType")} options={Object.entries(EVENT_TYPE).map(([k, v]) => [k, v.label])} />
          <Filter name="difficulty" label="Difficulty" value={p("difficulty")} options={Object.entries(LEVEL)} />
          <Filter name="holding" label="Holds at least" value={p("holding")} options={Object.entries(HOLDING).map(([k, v]) => [k, v.label])} />
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-medium text-ink-3">Max cost / plate</span>
            <input name="maxCost" defaultValue={p("maxCost")} inputMode="decimal" placeholder="$" className="h-9 rounded-lg border border-line-strong/60 bg-white/70 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-wine/20" />
          </label>
          <button type="submit" className="h-9 self-end rounded-lg bg-espresso px-4 text-sm font-medium text-linen">Apply</button>
        </form>
      </details>

      <div className="space-y-8">
        {courses.map((c) => (
          <section key={c}>
            <h2 className="eyebrow mb-3 px-1 text-ink-2">{COURSE[c]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.filter(({ d }) => d.course === c).map(({ d, cost }) => {
                const hold = metaOf(HOLDING, d.holdingQuality);
                return (
                  <Link key={d.id} href={`/dishes/${d.id}`}>
                    <Card className="flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                      <div className="font-display text-[1.4rem] leading-snug">{d.name}</div>
                      {d.description && <p className="mt-1 line-clamp-2 text-[0.8125rem] italic text-ink-2">{d.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {d.dietaryTags.map((t) => <Badge key={t} tone="sage" size="xs">{t}</Badge>)}
                        <Badge tone={hold.tone} size="xs">{hold.label}</Badge>
                      </div>
                      <div className="mt-auto flex items-end justify-between pt-4">
                        <span className="text-xs text-ink-3">{[d.cuisine, d.protein].filter(Boolean).join(" · ")}<br />{d.components.length} component{d.components.length === 1 ? "" : "s"} · {LEVEL[d.difficulty].toLowerCase()} difficulty</span>
                        <span className="text-right"><span className="font-display text-xl tabular">{formatMoney(cost, { exact: true })}</span><span className="block text-[0.6875rem] text-ink-3">per plate</span></span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        {filtered.length === 0 && <p className="py-10 text-center text-ink-3">No dishes match these filters.</p>}
      </div>
      <p className="mt-8 text-center text-xs text-ink-4">
        <Link href={p("archived") === "1" ? "/dishes" : "/dishes?archived=1"} className="hover:text-wine">{p("archived") === "1" ? "← Back to active dishes" : "View archived dishes"}</Link>
      </p>
    </div>
  );
}

async function EventMenus() {
  const { today } = await getToday();
  const menus = await db.menu.findMany({
    where: { event: { status: { not: "CANCELLED" }, date: { gte: fromISODate(today) } } },
    include: { event: { select: { id: true, name: true, date: true, guestCount: true, client: { select: { name: true } } } }, courses: { include: { items: { include: { dish: { select: { name: true } } } } } } },
    orderBy: { event: { date: "asc" } },
  });
  return (
    <div>
      <PageHeader
        eyebrow="Kitchen"
        title="Event menus"
        description="Every upcoming menu and where it stands with the client."
        actions={<Segmented active="menus" options={[{ key: "library", label: "Dish Library", href: "/dishes" }, { key: "menus", label: "Event menus", href: "/dishes?view=menus" }]} />}
      />
      <Card className="divide-y divide-line/70">
        {menus.map((m) => {
          const st = metaOf(MENU_STATUS, m.status);
          const dishes = m.courses.flatMap((c) => c.items.map((i) => i.dish.name));
          return (
            <Link key={m.id} href={`/events/${m.event.id}?tab=menu`} className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-sand/40 sm:flex-row sm:items-center">
              <div className="w-28 shrink-0 text-sm text-ink-3">{formatDate.medium(toISODate(m.event.date))}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{m.event.name}</div>
                <div className="truncate text-[0.8125rem] text-ink-3">{dishes.length ? dishes.join(" · ") : "No dishes yet"}</div>
              </div>
              <span className="text-xs text-ink-3">{menuItemCount(m)} dishes · {m.event.guestCount} guests</span>
              <Badge tone={st.tone} size="xs">{st.label}</Badge>
            </Link>
          );
        })}
        {menus.length === 0 && <p className="px-5 py-10 text-center text-ink-3">No upcoming menus.</p>}
      </Card>
    </div>
  );
}
