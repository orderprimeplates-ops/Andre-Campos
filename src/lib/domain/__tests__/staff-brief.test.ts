import { describe, expect, it } from "vitest";
import { buildStaffBrief, parseSections, type StaffBriefSource } from "../../staff-brief";

const source: StaffBriefSource = {
  name: "Harper Birthday Dinner", clientName: "Ciara Harper", date: "2026-10-10",
  arrivalTime: "16:30", serviceTime: "19:00", endTime: "22:30", guestCount: 12, serviceStyle: "PLATED",
  dietarySummary: "One pescatarian", criticalNotes: "Speeches at 8:15", staffNotes: "Garnish entrée at the pass",
  clientAllergies: "tree nuts", clientDietary: null,
  venue: { name: "Harper Residence", address: "1 Main St", city: "Coral Gables", state: "FL", gateCode: "4418#", parkingInstructions: "Side driveway", contactName: null, contactPhone: null, ovenNotes: "Runs hot", electricalNotes: null, outdoorCooking: null, otherNotes: null },
  runOfShow: [
    { time: "16:30", title: "Arrive & load in", kind: "ARRIVAL", details: "Unload\nPreheat oven" },
    { time: "21:45", title: "Breakdown", kind: "BREAKDOWN", details: "Clean kitchen" },
  ],
  courses: [{ name: "Entrée", fireTime: "20:30", items: [{ dish: "Sea Bass", description: "Beurre blanc", notes: "No gremolata seat 1", guestCount: 5 }] }],
  guestNotes: [{ guestName: "Marcus", restriction: "Tree nuts", severity: "SEVERE_ALLERGY", count: 1, notes: null }],
  staff: [{ name: "Marisol", role: "SOUS_CHEF", callTime: "16:30", endTime: "22:30", responsibilities: "Plating line", phone: "305-555-0142" }],
  equipment: [{ name: "Induction Burner", quantity: 2, status: "PACKED", notes: null, category: "Cooking" }],
  prepTasks: [{ title: "Load cooler", phase: "BEFORE_DEPARTURE" }],
};

describe("staff event brief", () => {
  it("never carries financial data, even if it is passed in by mistake", () => {
    const leaky = { ...source, priceCents: 987654, depositCents: 123456, internalNotes: "SECRET margin note", payments: [{ amountCents: 55555 }], rateCents: 4242 } as StaffBriefSource;
    const json = JSON.stringify(buildStaffBrief(leaky));
    for (const secret of ["987654", "123456", "SECRET", "55555", "4242", "$"]) expect(json).not.toContain(secret);
  });

  it("includes the operational essentials", () => {
    const b = buildStaffBrief(source);
    const json = JSON.stringify(b);
    expect(b.critical[0]).toContain("SEVERE ALLERGY: Tree nuts (Marcus)");
    for (const s of ["4418#", "Sea Bass", "No gremolata", "Marisol", "Plating line", "Garnish entrée", "Induction Burner", "Load cooler", "Runs hot"]) expect(json).toContain(s);
  });

  it("respects chosen sections and keeps breakdown out of the timeline when cleanup is separate", () => {
    const b = buildStaffBrief(source, ["timeline", "cleanup"]);
    expect(b.sections.map((s) => s.key)).toEqual(["timeline", "cleanup"]);
    const timeline = JSON.stringify(b.sections[0]);
    expect(timeline).not.toContain("Breakdown");
    expect(JSON.stringify(b.sections[1])).toContain("Clean kitchen");
    expect(JSON.stringify(buildStaffBrief(source, ["timeline"]).sections[0])).toContain("Breakdown");
    expect(parseSections("menu,bogus,staff")).toEqual(["menu", "staff"]);
  });
});
