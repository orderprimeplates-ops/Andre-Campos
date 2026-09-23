import "server-only";
import { db } from "./db";
import { parseLooseDate } from "@/lib/domain/search";
import { formatDate, toISODate, type ISODate } from "@/lib/domain/dates";
import { COURSE, EVENT_TYPE, INGREDIENT_CATEGORY, LEAD_STATUS, RECIPE_CATEGORY, STAFF_ROLE } from "@/lib/status";

export type SearchKind = "client" | "event" | "lead" | "dish" | "recipe" | "ingredient" | "staff" | "venue";

export interface SearchResult {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const LIMIT = 6;

export async function searchEverything(q: string, today: ISODate): Promise<SearchResult[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const contains = { contains: term, mode: "insensitive" as const };
  const dates = parseLooseDate(term, today).map((d) => new Date(`${d}T00:00:00Z`));
  const typeMatches = Object.entries(EVENT_TYPE)
    .filter(([, m]) => m.label.toLowerCase().includes(term.toLowerCase()))
    .map(([k]) => k) as never[];

  const [clients, events, leads, dishes, recipes, ingredients, staff, venues] = await Promise.all([
    db.client.findMany({
      where: { OR: [{ name: contains }, { company: contains }, { email: contains }, { phone: contains }] },
      take: LIMIT, orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, company: true, _count: { select: { events: true } } },
    }),
    db.event.findMany({
      where: {
        OR: [
          { name: contains },
          { client: { name: contains } },
          { client: { company: contains } },
          { venue: { name: contains } },
          ...(dates.length ? [{ date: { in: dates } }] : []),
          ...(typeMatches.length ? [{ eventType: { in: typeMatches } }] : []),
          { menu: { courses: { some: { items: { some: { dish: { name: contains } } } } } } },
        ],
      },
      take: LIMIT + 2, orderBy: { date: "desc" },
      select: { id: true, name: true, date: true, guestCount: true, client: { select: { name: true } } },
    }),
    db.lead.findMany({
      where: { OR: [{ name: contains }, { email: contains }, { location: contains }, { notes: contains }], status: { notIn: ["BOOKED"] } },
      take: LIMIT, orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, eventDate: true },
    }),
    db.dish.findMany({
      where: { archived: false, OR: [{ name: contains }, { description: contains }, { cuisine: contains }, { protein: contains }] },
      take: LIMIT, orderBy: { name: "asc" }, select: { id: true, name: true, course: true, description: true },
    }),
    db.recipe.findMany({
      where: { OR: [{ name: contains }, { ingredients: { some: { ingredient: { name: contains } } } }] },
      take: LIMIT, orderBy: { name: "asc" }, select: { id: true, name: true, category: true },
    }),
    db.ingredient.findMany({ where: { name: contains }, take: LIMIT, orderBy: { name: "asc" }, select: { id: true, name: true, category: true } }),
    db.staffMember.findMany({
      where: { OR: [{ name: contains }, { email: contains }, { phone: contains }] },
      take: LIMIT, select: { id: true, name: true, role: true, phone: true },
    }),
    db.venue.findMany({
      where: { OR: [{ name: contains }, { address: contains }, { city: contains }] },
      take: LIMIT, select: { id: true, name: true, city: true, events: { select: { id: true }, orderBy: { date: "desc" }, take: 1 } },
    }),
  ]);

  return [
    ...events.map((e) => ({
      kind: "event" as const, id: e.id, title: e.name, href: `/events/${e.id}`,
      subtitle: `${formatDate.medium(toISODate(e.date))} · ${e.client.name} · ${e.guestCount} guests`,
    })),
    ...clients.map((c) => ({
      kind: "client" as const, id: c.id, title: c.name, href: `/clients/${c.id}`,
      subtitle: [c.company, `${c._count.events} event${c._count.events === 1 ? "" : "s"}`].filter(Boolean).join(" · "),
    })),
    ...leads.map((l) => ({
      kind: "lead" as const, id: l.id, title: l.name, href: `/leads/${l.id}`,
      subtitle: [LEAD_STATUS[l.status]?.label, l.eventDate ? formatDate.short(toISODate(l.eventDate)) : null].filter(Boolean).join(" · "),
    })),
    ...dishes.map((d) => ({ kind: "dish" as const, id: d.id, title: d.name, href: `/dishes/${d.id}`, subtitle: [COURSE[d.course], d.description].filter(Boolean).join(" · ") })),
    ...recipes.map((r) => ({ kind: "recipe" as const, id: r.id, title: r.name, href: `/recipes/${r.id}`, subtitle: RECIPE_CATEGORY[r.category] })),
    ...ingredients.map((i) => ({ kind: "ingredient" as const, id: i.id, title: i.name, href: `/ingredients?focus=${i.id}`, subtitle: INGREDIENT_CATEGORY[i.category] })),
    ...staff.map((s) => ({ kind: "staff" as const, id: s.id, title: s.name, href: `/staff/${s.id}`, subtitle: [STAFF_ROLE[s.role], s.phone].filter(Boolean).join(" · ") })),
    ...venues.map((v) => ({
      kind: "venue" as const, id: v.id, title: v.name, subtitle: v.city ?? "Venue",
      href: v.events[0] ? `/events/${v.events[0].id}?tab=venue` : "/events",
    })),
  ];
}
