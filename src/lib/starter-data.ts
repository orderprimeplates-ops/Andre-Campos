/**
 * Defaults every new Prime Plates HQ starts with — used by first-run setup and the sample data.
 * Platform rates are starting points only; they're editable in Settings.
 */

export const DEFAULT_VENDORS = ["Restaurant Depot", "Costco", "Sam's Club", "Publix", "Whole Foods", "Trader Joe's", "Other"];

export const DEFAULT_PLATFORMS = [
  { name: "Direct", isDirect: true, commissionPct: 0, fixedFeeCents: 0, processingPct: 2.9, processingFixedCents: 30, notes: "Card payments via your processor. Update if you use a different rate." },
  { name: "Airbnb Experiences", isDirect: false, commissionPct: 20, fixedFeeCents: 0, processingPct: 0, processingFixedCents: 0, notes: "Placeholder rate — verify your current host fee." },
  { name: "GigSalad", isDirect: false, commissionPct: 5, fixedFeeCents: 0, processingPct: 3, processingFixedCents: 0, notes: "Placeholder rate — verify your membership tier." },
  { name: "Yhangry", isDirect: false, commissionPct: 15, fixedFeeCents: 0, processingPct: 0, processingFixedCents: 0, notes: "Placeholder rate — verify." },
  { name: "Thumbtack", isDirect: false, commissionPct: 0, fixedFeeCents: 4500, processingPct: 2.9, processingFixedCents: 30, notes: "Pay-per-lead; lead cost entered as a fixed fee. Placeholder." },
  { name: "The Bash", isDirect: false, commissionPct: 5, fixedFeeCents: 0, processingPct: 2.9, processingFixedCents: 30, notes: "Placeholder rate — verify." },
];

/** Timezones offered at setup; anything valid can be entered later in Settings. */
export const US_TIMEZONES: [string, string][] = [
  ["America/New_York", "Eastern (New York, Miami)"],
  ["America/Chicago", "Central (Chicago, Dallas)"],
  ["America/Denver", "Mountain (Denver)"],
  ["America/Phoenix", "Arizona (Phoenix)"],
  ["America/Los_Angeles", "Pacific (Los Angeles)"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
];
