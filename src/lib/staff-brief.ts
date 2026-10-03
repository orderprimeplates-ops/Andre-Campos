/**
 * The Staff Event Brief: what the team needs to execute an event — and nothing else.
 *
 * PRIVACY: this module is the only path from an event to a staff-facing document. It accepts a
 * narrow, explicitly listed set of operational fields and builds a new object from them. Prices,
 * deposits, balances, payments, costs, staff pay rates, margins and internal notes are not part of
 * the input type, so they cannot reach the brief, its preview or the PDF.
 */

import { formatDate, formatTime, minutesOf, type ISODate } from "./domain/dates";
import { DIETARY_SEVERITY, PACK_STATUS, SERVICE_STYLE, STAFF_ROLE } from "./status";

export const BRIEF_SECTIONS = [
  { key: "overview", label: "Event overview" },
  { key: "timeline", label: "Timeline" },
  { key: "menu", label: "Menu" },
  { key: "dietary", label: "Dietary information" },
  { key: "staff", label: "Staff assignments" },
  { key: "notes", label: "Setup & service notes" },
  { key: "equipment", label: "Equipment & packing" },
  { key: "cleanup", label: "Breakdown & cleanup" },
] as const;

export type BriefSectionKey = (typeof BRIEF_SECTIONS)[number]["key"];
export const ALL_SECTIONS: BriefSectionKey[] = BRIEF_SECTIONS.map((s) => s.key);

export function parseSections(raw: string | null | undefined): BriefSectionKey[] {
  if (!raw) return ALL_SECTIONS;
  const wanted = new Set(raw.split(","));
  return ALL_SECTIONS.filter((k) => wanted.has(k));
}

/** Operational fields only — see the privacy note above. */
export interface StaffBriefSource {
  name: string;
  clientName: string;
  date: ISODate;
  arrivalTime: string | null;
  serviceTime: string | null;
  endTime: string | null;
  guestCount: number;
  serviceStyle: string;
  dietarySummary: string | null;
  criticalNotes: string | null;
  staffNotes: string | null;
  clientAllergies: string | null;
  clientDietary: string | null;
  venue: {
    name: string; address: string | null; city: string | null; state: string | null;
    gateCode: string | null; parkingInstructions: string | null; contactName: string | null; contactPhone: string | null;
    ovenNotes: string | null; electricalNotes: string | null; outdoorCooking: string | null; otherNotes: string | null;
  } | null;
  runOfShow: { time: string; title: string; kind: string; details: string | null }[];
  courses: { name: string; fireTime: string | null; items: { dish: string; description: string | null; notes: string | null; guestCount: number | null }[] }[];
  guestNotes: { guestName: string | null; restriction: string; severity: string; count: number; notes: string | null }[];
  staff: { name: string | null; role: string; callTime: string | null; endTime: string | null; responsibilities: string | null; phone: string | null }[];
  equipment: { name: string; quantity: number; status: string; notes: string | null; category: string }[];
  prepTasks: { title: string; phase: string }[];
}

export interface BriefLine { time?: string; title: string; detail?: string[]; check?: boolean }
export interface BriefBlock { heading?: string; lines: BriefLine[] }
export interface BriefSection { key: BriefSectionKey; title: string; blocks: BriefBlock[]; facts?: [string, string][] }

export interface StaffBrief {
  title: string;
  subtitle: string;
  dateLabel: string;
  critical: string[];
  sections: BriefSection[];
}

const lines = (s: string | null | undefined) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const t = (time: string | null | undefined) => (time ? formatTime(time) : "");
const BREAKDOWN_KINDS = new Set(["BREAKDOWN", "DEPARTURE"]);

export function buildStaffBrief(src: StaffBriefSource, sections: BriefSectionKey[] = ALL_SECTIONS): StaffBrief {
  const want = new Set(sections);
  const separateCleanup = want.has("cleanup");
  const allergies = src.guestNotes.filter((g) => g.severity === "ALLERGY" || g.severity === "SEVERE_ALLERGY");
  const critical = [
    ...allergies.map((g) => `${g.severity === "SEVERE_ALLERGY" ? "SEVERE ALLERGY" : "Allergy"}: ${g.restriction}${g.guestName ? ` (${g.guestName})` : g.count > 1 ? ` × ${g.count}` : ""}`),
    ...(allergies.length === 0 && src.clientAllergies ? [`Allergy: ${src.clientAllergies}`] : []),
    ...lines(src.criticalNotes),
  ];

  const out: BriefSection[] = [];
  const add = (key: BriefSectionKey, title: string, blocks: BriefBlock[], facts?: [string, string][]) => {
    if (!want.has(key)) return;
    const kept = blocks.filter((b) => b.lines.length);
    if (kept.length || facts?.length) out.push({ key, title, blocks: kept, facts });
  };

  // Overview
  const v = src.venue;
  const address = v ? [v.address, [v.city, v.state].filter(Boolean).join(", ")].filter(Boolean).join(", ") : "";
  add("overview", "Event overview", [], [
    ["Event", src.name],
    ["Host", src.clientName],
    ["Date", formatDate.long(src.date)],
    ...(v ? [["Venue", v.name] as [string, string]] : []),
    ...(address ? [["Address", address] as [string, string]] : []),
    ...(v?.gateCode ? [["Gate / access", v.gateCode] as [string, string]] : []),
    ...(v?.parkingInstructions ? [["Parking", v.parkingInstructions] as [string, string]] : []),
    ...(v?.contactName || v?.contactPhone ? [["On-site contact", [v.contactName, v.contactPhone].filter(Boolean).join(" · ")] as [string, string]] : []),
    ["Guests", String(src.guestCount)],
    ["Service style", SERVICE_STYLE[src.serviceStyle] ?? src.serviceStyle],
  ]);

  // Timeline
  const staffCalls = src.staff.map((s) => s.callTime).filter((x): x is string => !!x).sort();
  const keyTimes: BriefLine[] = ([
    { hm: src.arrivalTime, title: "Chef arrival" },
    { hm: staffCalls[0], title: "Staff arrival", detail: staffCalls.length > 1 && staffCalls.at(-1) !== staffCalls[0] ? [`Call times through ${t(staffCalls.at(-1))} — see Staff`] : undefined },
    { hm: src.serviceTime, title: "Service starts" },
    ...src.courses.map((c) => ({ hm: c.fireTime, title: `Fire: ${c.name}` })),
    { hm: src.endTime, title: "Expected completion" },
  ] as { hm: string | null | undefined; title: string; detail?: string[] }[])
    .filter((k): k is { hm: string; title: string; detail?: string[] } => !!k.hm)
    .sort((x, y) => (minutesOf(x.hm) ?? 0) - (minutesOf(y.hm) ?? 0))
    .map((k) => ({ time: t(k.hm), title: k.title, detail: k.detail }));
  const run = src.runOfShow.filter((r) => !(separateCleanup && BREAKDOWN_KINDS.has(r.kind)));
  add("timeline", "Timeline", [
    { heading: "Key times", lines: keyTimes },
    { heading: "Run of show", lines: run.map((r) => ({ time: t(r.time), title: r.title, detail: lines(r.details), check: true })) },
  ]);

  // Menu
  add("menu", "Menu", src.courses.map((c) => ({
    heading: `${c.name}${c.fireTime ? ` · fire ${t(c.fireTime)}` : ""}`,
    lines: c.items.map((i) => ({
      title: `${i.dish}${i.guestCount ? ` × ${i.guestCount}` : ""}`,
      detail: [...lines(i.description), ...lines(i.notes).map((n) => `Note: ${n}`)],
    })),
  })));

  // Dietary
  add("dietary", "Dietary information", [
    {
      heading: "Guest restrictions",
      lines: src.guestNotes
        .slice()
        .sort((a, b) => sevRank(b.severity) - sevRank(a.severity))
        .map((g) => ({
          title: `${DIETARY_SEVERITY[g.severity]?.label ?? g.severity}: ${g.restriction}${g.guestName ? ` — ${g.guestName}` : g.count > 1 ? ` × ${g.count}` : ""}`,
          detail: lines(g.notes),
        })),
    },
    { heading: "Notes", lines: [...lines(src.dietarySummary), ...(src.clientDietary ? [`Host: ${src.clientDietary}`] : []), ...(src.clientAllergies && allergies.length ? [`Host allergies: ${src.clientAllergies}`] : [])].map((l) => ({ title: l })) },
  ]);

  // Staff
  add("staff", "Staff assignments", [{
    lines: src.staff.map((s) => ({
      title: `${s.name ?? "Open role"} — ${STAFF_ROLE[s.role] ?? s.role}`,
      detail: [
        [s.callTime ? `Call ${t(s.callTime)}${s.endTime ? ` – ${t(s.endTime)}` : ""}` : null, s.phone].filter(Boolean).join(" · "),
        ...lines(s.responsibilities),
      ].filter(Boolean),
    })),
  }]);

  // Setup & service notes
  const kitchen = v ? [
    ...lines(v.ovenNotes).map((l) => `Oven: ${l}`),
    ...lines(v.electricalNotes).map((l) => `Electrical: ${l}`),
    ...lines(v.outdoorCooking).map((l) => `Outdoor cooking: ${l}`),
    ...lines(v.otherNotes),
  ] : [];
  add("notes", "Setup & service notes", [
    { heading: "From the chef", lines: lines(src.staffNotes).map((l) => ({ title: l })) },
    { heading: "Venue & kitchen", lines: kitchen.map((l) => ({ title: l })) },
    { heading: "Before leaving the kitchen", lines: src.prepTasks.filter((p) => p.phase === "BEFORE_DEPARTURE").map((p) => ({ title: p.title, check: true })) },
    { heading: "On site", lines: src.prepTasks.filter((p) => p.phase === "ON_SITE").map((p) => ({ title: p.title, check: true })) },
  ]);

  // Equipment
  const byCat = new Map<string, BriefLine[]>();
  for (const e of src.equipment) {
    const list = byCat.get(e.category) ?? [];
    list.push({ title: `${e.quantity > 1 ? `${e.quantity} × ` : ""}${e.name}`, detail: [...lines(e.notes), ...(e.status !== "REQUIRED" ? [`Status: ${PACK_STATUS[e.status]?.label ?? e.status}`] : [])], check: true });
    byCat.set(e.category, list);
  }
  add("equipment", "Equipment & packing", [...byCat].map(([heading, l]) => ({ heading, lines: l })));

  // Cleanup
  const breakdown = src.runOfShow.filter((r) => BREAKDOWN_KINDS.has(r.kind));
  add("cleanup", "Breakdown & cleanup", [
    { lines: breakdown.map((r) => ({ time: t(r.time), title: r.title, detail: lines(r.details), check: true })) },
    { heading: "Return to the kitchen", lines: src.equipment.length ? [{ title: `All ${src.equipment.reduce((s, e) => s + e.quantity, 0)} equipment items packed and returned`, check: true }] : [] },
  ]);

  return {
    title: src.name,
    subtitle: [v?.name, `${src.guestCount} guests`, SERVICE_STYLE[src.serviceStyle] ?? src.serviceStyle].filter(Boolean).join(" · "),
    dateLabel: `${formatDate.long(src.date)}${src.serviceTime ? ` · service ${t(src.serviceTime)}` : ""}`,
    critical,
    sections: out,
  };
}

function sevRank(s: string) {
  return ["PREFERENCE", "INTOLERANCE", "ALLERGY", "SEVERE_ALLERGY"].indexOf(s);
}
