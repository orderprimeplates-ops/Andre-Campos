/**
 * The single source for how every status, type and category is labelled and coloured.
 * Change a label or tone here and it changes everywhere.
 */

export type Tone = "neutral" | "wine" | "sage" | "amber" | "clay" | "slate" | "ocean" | "plum" | "champagne";

interface Meta {
  label: string;
  tone: Tone;
}

const m = (label: string, tone: Tone): Meta => ({ label, tone });

export const LEAD_STATUS: Record<string, Meta> = {
  NEW: m("New", "wine"),
  CONTACTED: m("Contacted", "slate"),
  QUOTE_SENT: m("Menu / Quote Sent", "plum"),
  FOLLOW_UP: m("Follow-Up", "amber"),
  NEGOTIATING: m("Negotiating", "champagne"),
  BOOKED: m("Booked", "sage"),
  LOST: m("Lost", "neutral"),
};
export const LEAD_PIPELINE = ["NEW", "CONTACTED", "QUOTE_SENT", "FOLLOW_UP", "NEGOTIATING", "BOOKED", "LOST"] as const;

export const LEAD_SOURCE: Record<string, string> = {
  WEBSITE: "Website", GOOGLE: "Google", INSTAGRAM: "Instagram", TIKTOK: "TikTok", REFERRAL: "Referral", PLANNER: "Planner",
  AIRBNB: "Airbnb", GIGSALAD: "GigSalad", THUMBTACK: "Thumbtack", YHANGRY: "Yhangry", THE_BASH: "The Bash",
  REPEAT_CLIENT: "Repeat client", OTHER: "Other",
};

export const LOST_REASON: Record<string, string> = {
  PRICE: "Price", DATE_UNAVAILABLE: "Date unavailable", NO_RESPONSE: "No response", COMPETITOR: "Went with competitor",
  BUDGET_MISMATCH: "Budget mismatch", OTHER: "Other",
};

export const EVENT_STATUS: Record<string, Meta> = {
  INQUIRY: m("Inquiry", "neutral"),
  TENTATIVE: m("Tentative", "amber"),
  BOOKED: m("Booked", "slate"),
  PLANNING: m("Planning", "plum"),
  READY: m("Ready", "sage"),
  COMPLETED: m("Completed", "neutral"),
  CANCELLED: m("Cancelled", "clay"),
};
export const EVENT_STATUS_ORDER = ["INQUIRY", "TENTATIVE", "BOOKED", "PLANNING", "READY", "COMPLETED", "CANCELLED"] as const;

export const EVENT_TYPE: Record<string, Meta> = {
  PRIVATE_DINNER: m("Private Dinner", "wine"),
  PLATED_DINNER: m("Plated Dinner", "wine"),
  FAMILY_STYLE: m("Family-Style Dinner", "amber"),
  BUFFET: m("Buffet", "slate"),
  BRUNCH: m("Brunch", "amber"),
  COCKTAIL: m("Cocktail Event", "plum"),
  WEDDING: m("Wedding", "champagne"),
  CORPORATE: m("Corporate Event", "slate"),
  COOKING_CLASS: m("Cooking Class", "sage"),
  VACATION_CHEF: m("Vacation Chef", "ocean"),
  DROP_OFF: m("Drop-Off Catering", "neutral"),
  OTHER: m("Other", "neutral"),
};

export const SERVICE_STYLE: Record<string, string> = {
  PLATED: "Plated", FAMILY_STYLE: "Family-style", BUFFET: "Buffet", STATIONS: "Stations", PASSED: "Passed",
  DROP_OFF: "Drop-off", INTERACTIVE: "Interactive / class",
};

export const MENU_STATUS: Record<string, Meta> = {
  DRAFT: m("Draft", "neutral"),
  SENT: m("Sent to client", "amber"),
  APPROVED: m("Approved", "sage"),
};

export const PAYMENT_STATUS: Record<string, Meta> = {
  DEPOSIT_DUE: m("Deposit Due", "amber"),
  DEPOSIT_PAID: m("Deposit Paid", "slate"),
  BALANCE_DUE: m("Balance Due", "amber"),
  PAID: m("Paid", "sage"),
  NO_CHARGE: m("No charge", "neutral"),
};

export const PREP_STATUS: Record<string, Meta> = {
  NOT_STARTED: m("Not Started", "neutral"),
  IN_PROGRESS: m("In Progress", "amber"),
  COMPLETE: m("Complete", "sage"),
};

export const STAFF_STATUS: Record<string, Meta> = {
  NEEDED: m("Needed", "clay"),
  INVITED: m("Invited", "amber"),
  CONFIRMED: m("Confirmed", "sage"),
  COMPLETED: m("Completed", "slate"),
  PAID: m("Paid", "neutral"),
};

export const STAFF_ROLE: Record<string, string> = {
  CHEF: "Chef", SOUS_CHEF: "Sous Chef", KITCHEN_ASSISTANT: "Kitchen Assistant", SERVER: "Server", BARTENDER: "Bartender",
  CAPTAIN: "Event Captain", DISHWASHER: "Dishwasher", OTHER: "Other",
};

export const PACK_STATUS: Record<string, Meta> = {
  REQUIRED: m("Required", "neutral"),
  PACKED: m("Packed", "amber"),
  LOADED: m("Loaded", "slate"),
  ON_SITE: m("On Site", "plum"),
  RETURNED: m("Returned", "sage"),
};
export const PACK_ORDER = ["REQUIRED", "PACKED", "LOADED", "ON_SITE", "RETURNED"] as const;

export const CONDITION: Record<string, Meta> = {
  EXCELLENT: m("Excellent", "sage"),
  GOOD: m("Good", "slate"),
  FAIR: m("Fair", "amber"),
  NEEDS_REPAIR: m("Needs repair", "clay"),
};

export const SHOPPING_STATUS: Record<string, Meta> = {
  PENDING: m("To buy", "neutral"),
  PURCHASED: m("Purchased", "sage"),
  NOT_FOUND: m("Not found", "clay"),
  SUBSTITUTED: m("Substituted", "amber"),
};

export const INGREDIENT_CATEGORY: Record<string, string> = {
  PRODUCE: "Produce", MEAT: "Meat", SEAFOOD: "Seafood", DAIRY: "Dairy", DRY_GOODS: "Dry Goods", BAKERY: "Bakery",
  FROZEN: "Frozen", BEVERAGES: "Beverages", SPECIALTY: "Specialty", DISPOSABLES: "Disposables", OTHER: "Other",
};
export const INGREDIENT_CATEGORY_ORDER = Object.keys(INGREDIENT_CATEGORY);

export const COURSE: Record<string, string> = {
  WELCOME_BITE: "Welcome Bite", PASSED_APPETIZER: "Passed Appetizer", APPETIZER: "Appetizer", SOUP: "Soup", SALAD: "Salad",
  ENTREE: "Entrée", SIDE: "Side", DESSERT: "Dessert", LATE_NIGHT: "Late-Night Bite", BEVERAGE: "Beverage",
};

export const RECIPE_CATEGORY: Record<string, string> = {
  SAUCE: "Sauce", PROTEIN: "Protein", STARCH: "Starch", VEGETABLE: "Vegetable", SALAD: "Salad", SOUP: "Soup",
  DRESSING: "Dressing", GARNISH: "Garnish", BAKED: "Baked", DESSERT: "Dessert", BASE: "Base / Stock", BEVERAGE: "Beverage", OTHER: "Other",
};

export const PREP_PHASE: Record<string, string> = {
  SEVERAL_DAYS: "Several Days Before", TWO_DAYS: "Two Days Before", DAY_BEFORE: "Day Before",
  EVENT_MORNING: "Event Morning", BEFORE_DEPARTURE: "Before Departure", ON_SITE: "On-Site",
};
export const PREP_PHASE_ORDER = Object.keys(PREP_PHASE);

export const LEVEL: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
export const HOLDING: Record<string, Meta> = {
  POOR: m("Serve immediately", "clay"),
  FAIR: m("Holds briefly", "amber"),
  GOOD: m("Holds well", "slate"),
  EXCELLENT: m("Holds beautifully", "sage"),
};

export const SCALING_MODE: Record<string, string> = { LINEAR: "Scales normally", FIXED: "Fixed amount", PARTIAL: "Partial scaling" };

export const CONTACT_METHOD: Record<string, string> = {
  TEXT: "Text", CALL: "Call", EMAIL: "Email", INSTAGRAM: "Instagram DM", WHATSAPP: "WhatsApp",
};

export const DIETARY_SEVERITY: Record<string, Meta> = {
  PREFERENCE: m("Preference", "neutral"),
  INTOLERANCE: m("Intolerance", "amber"),
  ALLERGY: m("Allergy", "clay"),
  SEVERE_ALLERGY: m("Severe allergy", "clay"),
};

export const EXPENSE_CATEGORY: Record<string, string> = {
  FOOD: "Food", BEVERAGE: "Beverage", LABOR: "Event labor", PREP_LABOR: "Shopping & prep labor", TRAVEL: "Travel",
  MILEAGE: "Mileage", RENTALS: "Rentals", EQUIPMENT: "Equipment", DISPOSABLES: "Disposables", OTHER: "Other",
};

export const SPACE_LEVEL: Record<string, string> = { NONE: "None", LIMITED: "Limited", MODERATE: "Moderate", AMPLE: "Ample" };
export const AVAILABILITY: Record<string, string> = { NONE: "None — bring our own", PARTIAL: "Partial", FULL: "Full set" };

export const CALENDAR_ENTRY_TYPE: Record<string, string> = {
  SHOPPING: "Shopping", PREP: "Prep", DEADLINE: "Deadline", TASTING: "Tasting", MEETING: "Meeting", PERSONAL: "Personal", OTHER: "Other",
};

/** Tone → Tailwind classes. Kept as full literal strings so Tailwind can see them. */
export const TONE_CLASSES: Record<Tone, { pill: string; dot: string; soft: string; text: string; bar: string }> = {
  neutral: { pill: "bg-sand text-ink-2", dot: "bg-ink-4", soft: "bg-sand", text: "text-ink-2", bar: "bg-ink-4" },
  wine: { pill: "bg-wine-soft text-wine", dot: "bg-wine", soft: "bg-wine-soft", text: "text-wine", bar: "bg-wine" },
  sage: { pill: "bg-sage-soft text-sage", dot: "bg-sage", soft: "bg-sage-soft", text: "text-sage", bar: "bg-sage" },
  amber: { pill: "bg-amber-soft text-amber", dot: "bg-amber", soft: "bg-amber-soft", text: "text-amber", bar: "bg-amber" },
  clay: { pill: "bg-clay-soft text-clay", dot: "bg-clay", soft: "bg-clay-soft", text: "text-clay", bar: "bg-clay" },
  slate: { pill: "bg-slate-soft text-slate", dot: "bg-slate", soft: "bg-slate-soft", text: "text-slate", bar: "bg-slate" },
  ocean: { pill: "bg-ocean-soft text-ocean", dot: "bg-ocean", soft: "bg-ocean-soft", text: "text-ocean", bar: "bg-ocean" },
  plum: { pill: "bg-plum-soft text-plum", dot: "bg-plum", soft: "bg-plum-soft", text: "text-plum", bar: "bg-plum" },
  champagne: { pill: "bg-champagne-soft text-[#8a6a35]", dot: "bg-champagne", soft: "bg-champagne-soft", text: "text-[#8a6a35]", bar: "bg-champagne" },
};

export function metaOf(map: Record<string, Meta>, key: string | null | undefined): Meta {
  return (key && map[key]) || { label: key ?? "—", tone: "neutral" };
}
