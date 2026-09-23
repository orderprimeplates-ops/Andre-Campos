import { describe, expect, it } from "vitest";
import { computeAttention, type AttentionEvent } from "../attention";
import { buildCalendar } from "../calendar";
import { monthGrid, hoursBetween, todayIn, relativeDay } from "../dates";
import { kitchenReadiness } from "../kitchen";
import { draftPrepTasks, draftRunOfShow, scaledMinutes } from "../planning";
import { parseLooseDate } from "../search";

const today = "2026-10-01";

const event = (over: Partial<AttentionEvent> = {}): AttentionEvent => ({
  id: "e1", name: "Harper 40th", clientName: "Ciara Harper", date: "2026-10-03", status: "BOOKED",
  guestCountConfirmed: true, menuStatus: "APPROVED", menuItemCount: 5, depositOutstandingCents: 0,
  balanceCents: 0, openStaffRoles: 0, unconfirmedStaff: 0, kitchenMissingCritical: [], hasVenue: true,
  isDropOff: false, ...over,
});

describe("needs attention", () => {
  it("is quiet when everything is handled", () => {
    expect(computeAttention([event({ date: "2026-10-20" })], [], today)).toEqual([]);
  });

  it("flags overdue final counts, open staff and missing kitchen info", () => {
    const items = computeAttention([
      event({ guestCountConfirmed: false, finalCountDueDate: "2026-09-28", openStaffRoles: 1,
        kitchenMissingCritical: ["Oven"] }),
    ], [], today);
    const kinds = items.map((i) => i.kind);
    expect(kinds).toContain("final-count");
    expect(kinds).toContain("staffing");
    expect(kinds).toContain("kitchen");
    expect(items.find((i) => i.kind === "final-count")!.priority).toBe("urgent");
    // urgent items sort first
    expect(items[0].priority).toBe("urgent");
  });

  it("flags balances and close-out on past events", () => {
    const items = computeAttention([event({ date: "2026-09-25", balanceCents: 50000 })], [], today);
    expect(items.map((i) => i.kind).sort()).toEqual(["balance", "close-out"]);
  });

  it("ignores cancelled and completed events", () => {
    expect(computeAttention([event({ status: "CANCELLED", menuItemCount: 0 })], [], today)).toEqual([]);
  });

  it("surfaces new and overdue leads", () => {
    const items = computeAttention([], [
      { id: "l1", name: "Maya", status: "NEW", createdDate: "2026-09-29", lastContacted: false },
      { id: "l2", name: "Dev", status: "FOLLOW_UP", createdDate: "2026-09-01", lastContacted: true, nextFollowUpDate: "2026-09-26" },
      { id: "l3", name: "Lost", status: "LOST", createdDate: "2026-09-01", lastContacted: true, nextFollowUpDate: "2026-09-26" },
    ], today);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.priority === "urgent")).toBe(true);
  });
});

describe("calendar", () => {
  it("emits events plus unmet deadlines", () => {
    const items = buildCalendar([{
      id: "e1", name: "Harper 40th", clientName: "Ciara", eventType: "PRIVATE_DINNER", status: "BOOKED",
      date: "2026-10-03", guestCount: 12, guestCountConfirmed: false, finalCountDueDate: "2026-09-26",
      depositDueDate: "2026-09-01", balanceDueDate: "2026-09-30", shoppingDate: "2026-10-02",
      depositOutstandingCents: 0, balanceCents: 100000,
    }], []);
    expect(items.map((i) => i.kind)).toEqual(["final-count", "balance", "shopping", "event"]);
  });

  it("builds a Sunday-first month grid", () => {
    const grid = monthGrid("2026-10-15");
    expect(grid[0]).toBe("2026-09-27");
    expect(grid.length % 7).toBe(0);
    expect(grid).toContain("2026-10-31");
  });
});

describe("dates", () => {
  it("handles timezones and relative days", () => {
    // 03:00 UTC on Oct 2 is still Oct 1 in New York
    expect(todayIn("America/New_York", new Date("2026-10-02T03:00:00Z"))).toBe("2026-10-01");
    expect(hoursBetween("22:00", "02:00")).toBe(4);
    expect(relativeDay("2026-10-02", today)).toBe("Tomorrow");
  });
});

describe("kitchen readiness", () => {
  it("counts known items and lists missing critical ones", () => {
    const r = kitchenReadiness({ address: "1 Ocean Dr", hasOven: true, fridgeSpace: "LIMITED", hasSink: false });
    expect(r.knownCount).toBe(4);
    expect(r.missingCritical).toEqual(["On-site contact", "Stove type", "Counter / prep space"]);
    expect(kitchenReadiness(null).hasVenue).toBe(false);
  });
});

describe("planning", () => {
  it("scales prep time sub-linearly", () => {
    expect(scaledMinutes(60, 1)).toBe(60);
    expect(scaledMinutes(60, 3)).toBe(130);
    expect(scaledMinutes(60, 0.25)).toBe(35);
  });

  it("only drafts tasks that don't already exist", () => {
    const recipe = { id: "r1", name: "Beurre Blanc", yieldPortions: 8, lines: [], defaultPrepPhase: "DAY_BEFORE" as const, prepMinutes: 20, cookMinutes: 10 };
    const drafts = draftPrepTasks(
      [{ recipe, portions: 16, factor: 2, usedIn: ["Sea Bass"] }],
      [{ id: "d1", name: "Sea Bass" }],
      [{ recipeId: "r1", generated: true }],
    );
    expect(drafts).toEqual([{ title: "Plate & garnish: Sea Bass", phase: "ON_SITE", dishId: "d1", estimatedMinutes: null }]);
  });

  it("drafts a run of show around course fire times", () => {
    const items = draftRunOfShow({ arrivalTime: "16:30", serviceTime: "19:00", courses: [
      { name: "First Course", fireTime: "19:00", dishes: ["Crudo"] },
      { name: "Entrée", dishes: ["Sea Bass"] },
    ] });
    expect(items[0]).toMatchObject({ time: "16:30", kind: "ARRIVAL" });
    expect(items.find((i) => i.title === "Serve Entrée")!.time).toBe("19:25");
    expect(items.at(-1)!.kind).toBe("DEPARTURE");
  });
});

describe("search date parsing", () => {
  it("understands common spoken and written dates", () => {
    expect(parseLooseDate("October 3", "2026-09-23")[0]).toBe("2026-10-03");
    expect(parseLooseDate("oct 3rd", "2026-09-23")[0]).toBe("2026-10-03");
    expect(parseLooseDate("3 Oct", "2026-09-23")[0]).toBe("2026-10-03");
    expect(parseLooseDate("10/3", "2026-09-23")[0]).toBe("2026-10-03");
    expect(parseLooseDate("10/3/27", "2026-09-23")).toEqual(["2027-10-03"]);
    expect(parseLooseDate("2026-10-03", "2026-09-23")).toEqual(["2026-10-03"]);
    expect(parseLooseDate("Feb 30", "2026-09-23")).toEqual([]);
    expect(parseLooseDate("sea bass", "2026-09-23")).toEqual([]);
  });
});
