/** Kitchen Readiness: how much do we know about the kitchen we're walking into? */

export interface VenueKitchen {
  address?: string | null;
  parkingInstructions?: string | null;
  gateCode?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  stoveType?: string | null;
  burnerCount?: number | null;
  hasOven?: boolean | null;
  hasGrill?: boolean | null;
  hasMicrowave?: boolean | null;
  fridgeSpace?: string | null;
  freezerSpace?: string | null;
  counterSpace?: string | null;
  hasSink?: boolean | null;
  hasDishwasher?: boolean | null;
  cookware?: string | null;
  sheetPans?: string | null;
  servingPieces?: string | null;
  plates?: string | null;
  flatware?: string | null;
  glassware?: string | null;
  electricalNotes?: string | null;
  outdoorCooking?: string | null;
}

export interface ReadinessItem {
  key: keyof VenueKitchen;
  label: string;
  group: "Access" | "Cooking" | "Storage & Space" | "Service";
  critical: boolean;
  known: boolean;
}

const CHECKS: Omit<ReadinessItem, "known">[] = [
  { key: "address", label: "Address", group: "Access", critical: true },
  { key: "parkingInstructions", label: "Parking", group: "Access", critical: false },
  { key: "contactPhone", label: "On-site contact", group: "Access", critical: true },
  { key: "stoveType", label: "Stove type", group: "Cooking", critical: true },
  { key: "burnerCount", label: "Burners", group: "Cooking", critical: false },
  { key: "hasOven", label: "Oven", group: "Cooking", critical: true },
  { key: "hasGrill", label: "Grill", group: "Cooking", critical: false },
  { key: "hasMicrowave", label: "Microwave", group: "Cooking", critical: false },
  { key: "electricalNotes", label: "Electrical limits", group: "Cooking", critical: false },
  { key: "outdoorCooking", label: "Outdoor cooking", group: "Cooking", critical: false },
  { key: "fridgeSpace", label: "Refrigerator space", group: "Storage & Space", critical: true },
  { key: "freezerSpace", label: "Freezer space", group: "Storage & Space", critical: false },
  { key: "counterSpace", label: "Counter / prep space", group: "Storage & Space", critical: true },
  { key: "hasSink", label: "Sink", group: "Storage & Space", critical: false },
  { key: "hasDishwasher", label: "Dishwasher", group: "Storage & Space", critical: false },
  { key: "cookware", label: "Cookware", group: "Service", critical: false },
  { key: "sheetPans", label: "Sheet pans", group: "Service", critical: false },
  { key: "servingPieces", label: "Serving pieces", group: "Service", critical: false },
  { key: "plates", label: "Plates", group: "Service", critical: false },
  { key: "flatware", label: "Flatware", group: "Service", critical: false },
  { key: "glassware", label: "Glassware", group: "Service", critical: false },
];

export function kitchenReadiness(venue: VenueKitchen | null | undefined) {
  const items: ReadinessItem[] = CHECKS.map((c) => {
    const v = venue?.[c.key];
    const known = v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");
    return { ...c, known };
  });
  const knownCount = items.filter((i) => i.known).length;
  const missingCritical = items.filter((i) => i.critical && !i.known).map((i) => i.label);
  return {
    items,
    knownCount,
    total: items.length,
    pct: Math.round((knownCount / items.length) * 100),
    missingCritical,
    hasVenue: !!venue,
  };
}
