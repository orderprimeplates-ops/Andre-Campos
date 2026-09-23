/**
 * Realistic sample data for Prime Plates HQ (development only).
 * All people, companies and addresses are fictional.
 *
 * Dates are relative to "today" in the business timezone so the Dashboard always looks like
 * an active week: an event in two days, a wedding next month, overdue follow-ups, etc.
 *
 * Run: npm run db:seed   (wipes business data first; keeps nothing but the schema)
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type Prisma,
  type Course,
  type EventType,
  type IngredientCategory,
  type PrepPhase,
  type RecipeCategory,
  type ScalingMode,
  type ServiceStyle,
  type StaffRole,
} from "../src/generated/prisma/client";
import { addDays, fromISODate, todayIn } from "../src/lib/domain/dates";
import { menuRequirements } from "../src/lib/domain/culinary";
import { draftPrepTasks, draftRunOfShow } from "../src/lib/domain/planning";
import { menuInclude, toMenuInput, toRecipeInput } from "../src/lib/mappers";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TZ = "America/New_York";
const TODAY = todayIn(TZ);
const day = (offset: number) => fromISODate(addDays(TODAY, offset));
const $ = (dollars: number) => Math.round(dollars * 100);

async function wipe() {
  // Order matters: children before parents.
  await db.$transaction([
    db.runOfShowItem.deleteMany(), db.prepTask.deleteMany(), db.shoppingItemState.deleteMany(),
    db.shoppingExtraItem.deleteMany(), db.eventEquipment.deleteMany(), db.staffAssignment.deleteMany(),
    db.payment.deleteMany(), db.eventExpense.deleteMany(), db.eventReview.deleteMany(), db.attachment.deleteMany(),
    db.calendarEntry.deleteMany(), db.guestDietaryNote.deleteMany(), db.menuItem.deleteMany(),
    db.menuCourse.deleteMany(), db.menu.deleteMany(), db.lead.deleteMany(), db.event.deleteMany(),
    db.venue.deleteMany(), db.client.deleteMany(), db.dishComponent.deleteMany(), db.dish.deleteMany(),
    db.recipeIngredient.deleteMany(), db.recipe.deleteMany(), db.ingredient.deleteMany(), db.vendor.deleteMany(),
    db.platform.deleteMany(), db.staffMember.deleteMany(), db.equipmentItem.deleteMany(),
    db.businessSettings.deleteMany(),
  ]);
}

async function main() {
  console.log(`Seeding Prime Plates HQ (today = ${TODAY})…`);
  await wipe();

  // ─── Owner account & settings ────────────────────────────────────────────
  const email = process.env.SEED_OWNER_EMAIL ?? "chef@primeplates.co";
  const password = process.env.SEED_OWNER_PASSWORD ?? "primeplates-dev";
  await db.user.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 12) },
    create: { email, name: "Andre", role: "OWNER", passwordHash: await bcrypt.hash(password, 12) },
  });
  await db.businessSettings.create({ data: { id: 1, ownerName: "Andre", timezone: TZ } });

  // ─── Vendors & platforms ─────────────────────────────────────────────────
  const vendorNames = ["Restaurant Depot", "Costco", "Sam's Club", "Publix", "Whole Foods", "Trader Joe's", "Casablanca Seafood", "Other"];
  const vendors: Record<string, string> = {};
  for (const [i, name] of vendorNames.entries()) {
    vendors[name] = (await db.vendor.create({ data: { name, sortOrder: i } })).id;
  }

  const platformData = [
    { name: "Direct", isDirect: true, commissionPct: 0, fixedFeeCents: 0, processingPct: 2.9, processingFixedCents: 30, notes: "Card payments via your processor. Update if you use a different rate." },
    { name: "Airbnb Experiences", commissionPct: 20, fixedFeeCents: 0, processingPct: 0, processingFixedCents: 0, notes: "Placeholder rate — verify your current host fee." },
    { name: "GigSalad", commissionPct: 5, fixedFeeCents: 0, processingPct: 3, processingFixedCents: 0, notes: "Placeholder rate — verify your membership tier." },
    { name: "Yhangry", commissionPct: 15, fixedFeeCents: 0, processingPct: 0, processingFixedCents: 0, notes: "Placeholder rate — verify." },
    { name: "Thumbtack", commissionPct: 0, fixedFeeCents: 4500, processingPct: 2.9, processingFixedCents: 30, notes: "Pay-per-lead; lead cost entered as a fixed fee. Placeholder." },
    { name: "The Bash", commissionPct: 5, fixedFeeCents: 0, processingPct: 2.9, processingFixedCents: 30, notes: "Placeholder rate — verify." },
  ];
  const platforms: Record<string, string> = {};
  for (const [i, p] of platformData.entries()) {
    platforms[p.name] = (await db.platform.create({ data: { ...p, sortOrder: i } })).id;
  }

  // ─── Ingredients ─────────────────────────────────────────────────────────
  type Ing = [name: string, cat: IngredientCategory, purchaseUnit: string, qty: number, unit: string, price: number, yieldPct: number, vendor: string, extra?: { gramsPerMl?: number; gramsPerEach?: number; notes?: string }];
  const ingredientData: Ing[] = [
    // Produce
    ["Shallots", "PRODUCE", "3 lb bag", 3, "lb", 6.49, 88, "Restaurant Depot", { gramsPerEach: 40 }],
    ["Garlic, peeled", "PRODUCE", "1 lb jar", 1, "lb", 4.99, 100, "Restaurant Depot", { gramsPerEach: 5, notes: "Recipes count cloves as “ea”." }],
    ["Yellow Onions", "PRODUCE", "10 lb bag", 10, "lb", 7.99, 90, "Restaurant Depot", { gramsPerEach: 250 }],
    ["Scallions", "PRODUCE", "bunch", 1, "bunch", 0.99, 100, "Publix"],
    ["Ginger", "PRODUCE", "lb", 1, "lb", 3.99, 85, "Publix"],
    ["Lemons", "PRODUCE", "each", 1, "ea", 0.69, 100, "Publix", { gramsPerEach: 100 }],
    ["Limes", "PRODUCE", "each", 1, "ea", 0.4, 100, "Publix", { gramsPerEach: 65 }],
    ["Asparagus", "PRODUCE", "lb", 1, "lb", 4.99, 75, "Costco", { notes: "Snap woody ends; 75% usable." }],
    ["Heirloom Carrots", "PRODUCE", "lb", 1, "lb", 3.49, 90, "Whole Foods"],
    ["Yukon Gold Potatoes", "PRODUCE", "5 lb bag", 5, "lb", 5.99, 90, "Publix"],
    ["Baby Arugula", "PRODUCE", "1 lb clamshell", 1, "lb", 6.99, 95, "Costco"],
    ["Heirloom Tomatoes", "PRODUCE", "lb", 1, "lb", 4.99, 92, "Whole Foods"],
    ["Avocados", "PRODUCE", "each", 1, "ea", 1.25, 100, "Costco", { gramsPerEach: 170 }],
    ["Chives", "PRODUCE", "bunch", 1, "bunch", 1.99, 100, "Publix"],
    ["Italian Parsley", "PRODUCE", "bunch", 1, "bunch", 0.99, 100, "Publix"],
    ["Fresh Thyme", "PRODUCE", "0.75 oz clamshell", 0.75, "oz", 2.49, 80, "Publix"],
    ["Fresh Basil", "PRODUCE", "0.75 oz clamshell", 0.75, "oz", 2.99, 85, "Publix"],
    ["Wild Mushroom Blend", "PRODUCE", "lb", 1, "lb", 12.99, 95, "Whole Foods"],
    ["Baby Bok Choy", "PRODUCE", "lb", 1, "lb", 2.99, 90, "Publix"],
    ["Mixed Berries", "PRODUCE", "lb", 1, "lb", 5.99, 95, "Costco"],
    ["Butternut Squash", "PRODUCE", "lb", 1, "lb", 1.49, 70, "Publix"],
    ["English Cucumbers", "PRODUCE", "each", 1, "ea", 0.79, 95, "Publix", { gramsPerEach: 340 }],
    ["Fresno Chiles", "PRODUCE", "lb", 1, "lb", 3.99, 90, "Whole Foods"],
    ["Microgreens", "PRODUCE", "2 oz clamshell", 2, "oz", 4.99, 100, "Whole Foods"],
    // Meat
    ["Beef Tenderloin (PSMO)", "MEAT", "lb", 1, "lb", 15.99, 72, "Restaurant Depot", { notes: "Recipe weights are trimmed; 72% yield after silverskin & chain." }],
    ["Bone-In Short Ribs", "MEAT", "lb", 1, "lb", 9.99, 100, "Restaurant Depot", { notes: "Recipes use bone-in weight." }],
    ["Boneless Chicken Thighs", "MEAT", "10 lb case", 10, "lb", 29.9, 95, "Restaurant Depot"],
    ["Thick-Cut Bacon", "MEAT", "lb", 1, "lb", 6.99, 100, "Costco"],
    // Seafood
    ["Chilean Sea Bass Fillet", "SEAFOOD", "lb", 1, "lb", 34.99, 95, "Casablanca Seafood", { notes: "Order 48 hours ahead." }],
    ["Salmon Fillet (Faroe Islands)", "SEAFOOD", "lb", 1, "lb", 13.99, 90, "Costco"],
    ["U10 Dry Sea Scallops", "SEAFOOD", "lb", 1, "lb", 32.99, 98, "Casablanca Seafood"],
    ["Sushi-Grade Yellowfin Tuna", "SEAFOOD", "lb", 1, "lb", 29.99, 90, "Casablanca Seafood"],
    ["Jumbo Lump Crab", "SEAFOOD", "1 lb container", 1, "lb", 39.99, 95, "Costco"],
    ["Osetra Caviar", "SPECIALTY", "1 oz tin", 1, "oz", 89, 100, "Other"],
    // Dairy
    ["Unsalted Butter", "DAIRY", "lb", 1, "lb", 4.49, 100, "Restaurant Depot", { gramsPerMl: 0.911 }],
    ["Heavy Cream", "DAIRY", "quart", 1, "qt", 5.49, 100, "Restaurant Depot", { gramsPerMl: 1.0 }],
    ["Whole Milk", "DAIRY", "gallon", 1, "gal", 3.99, 100, "Publix", { gramsPerMl: 1.03 }],
    ["Parmigiano-Reggiano", "DAIRY", "lb", 1, "lb", 16.99, 90, "Costco"],
    ["Burrata", "DAIRY", "8 oz tub (2 × 4 oz)", 8, "oz", 6.99, 100, "Whole Foods", { gramsPerEach: 113 }],
    ["Large Eggs", "DAIRY", "dozen", 12, "ea", 3.99, 100, "Publix", { gramsPerEach: 50 }],
    ["Crème Fraîche", "DAIRY", "8 oz tub", 8, "oz", 5.99, 100, "Whole Foods", { gramsPerMl: 1.0 }],
    // Dry goods
    ["Kosher Salt (Diamond)", "DRY_GOODS", "3 lb box", 3, "lb", 4.29, 100, "Restaurant Depot", { gramsPerMl: 0.54 }],
    ["Black Peppercorns", "DRY_GOODS", "18 oz jar", 18, "oz", 11.99, 100, "Costco", { gramsPerMl: 0.45 }],
    ["Extra Virgin Olive Oil", "DRY_GOODS", "3 L tin", 3, "l", 32.99, 100, "Costco", { gramsPerMl: 0.91 }],
    ["Canola Oil", "DRY_GOODS", "35 lb jug", 35, "lb", 38.99, 100, "Restaurant Depot", { gramsPerMl: 0.92 }],
    ["All-Purpose Flour", "DRY_GOODS", "25 lb bag", 25, "lb", 12.99, 100, "Restaurant Depot", { gramsPerMl: 0.53 }],
    ["Granulated Sugar", "DRY_GOODS", "25 lb bag", 25, "lb", 17.99, 100, "Restaurant Depot", { gramsPerMl: 0.85 }],
    ["White Miso", "DRY_GOODS", "1 lb tub", 1, "lb", 6.99, 100, "Whole Foods", { gramsPerMl: 1.2 }],
    ["Soy Sauce", "DRY_GOODS", "64 fl oz bottle", 64, "floz", 8.99, 100, "Restaurant Depot", { gramsPerMl: 1.2 }],
    ["Mirin", "DRY_GOODS", "17 fl oz bottle", 17, "floz", 5.49, 100, "Publix", { gramsPerMl: 1.1 }],
    ["Rice Vinegar", "DRY_GOODS", "32 fl oz bottle", 32, "floz", 4.99, 100, "Publix", { gramsPerMl: 1.0 }],
    ["Toasted Sesame Oil", "DRY_GOODS", "15 fl oz bottle", 15, "floz", 6.99, 100, "Publix", { gramsPerMl: 0.92 }],
    ["Forbidden Black Rice", "DRY_GOODS", "1 lb bag", 1, "lb", 5.99, 100, "Whole Foods", { gramsPerMl: 0.85 }],
    ["Arborio Rice", "DRY_GOODS", "2 lb bag", 2, "lb", 5.99, 100, "Publix", { gramsPerMl: 0.85 }],
    ["Sushi Rice", "DRY_GOODS", "5 lb bag", 5, "lb", 11.99, 100, "Costco", { gramsPerMl: 0.85 }],
    ["Panko Breadcrumbs", "DRY_GOODS", "1 lb bag", 1, "lb", 3.49, 100, "Publix", { gramsPerMl: 0.2 }],
    ["Dijon Mustard", "DRY_GOODS", "32 oz jar", 32, "oz", 6.99, 100, "Costco", { gramsPerMl: 1.0 }],
    ["Honey", "DRY_GOODS", "3 lb jar", 3, "lb", 14.99, 100, "Costco", { gramsPerMl: 1.42 }],
    ["Dry White Wine", "BEVERAGES", "750 ml bottle", 750, "ml", 9.99, 100, "Trader Joe's", { gramsPerMl: 1.0 }],
    ["Dry Red Wine", "BEVERAGES", "750 ml bottle", 750, "ml", 11.99, 100, "Trader Joe's", { gramsPerMl: 1.0 }],
    ["Chicken Stock", "DRY_GOODS", "1 qt carton", 1, "qt", 3.49, 100, "Publix", { gramsPerMl: 1.0 }],
    ["Veal Demi-Glace", "SPECIALTY", "16 oz tub", 16, "oz", 19.99, 100, "Restaurant Depot", { gramsPerMl: 1.1 }],
    ["Nori Sheets", "DRY_GOODS", "50-sheet pack", 50, "sheet", 14.99, 100, "Costco"],
    ["Dark Chocolate 70%", "DRY_GOODS", "2.2 lb bag callets", 2.2, "lb", 24.99, 100, "Restaurant Depot"],
    ["Vanilla Bean Paste", "SPECIALTY", "4 fl oz jar", 4, "floz", 15.99, 100, "Whole Foods", { gramsPerMl: 1.3 }],
    ["Maple Syrup", "DRY_GOODS", "32 fl oz jug", 32, "floz", 19.99, 100, "Costco", { gramsPerMl: 1.32 }],
    ["Balsamic Glaze", "DRY_GOODS", "12.7 fl oz bottle", 12.7, "floz", 6.99, 100, "Publix", { gramsPerMl: 1.3 }],
    ["Shelled Pistachios", "DRY_GOODS", "1 lb bag", 1, "lb", 12.99, 100, "Costco", { gramsPerMl: 0.52 }],
    ["Sesame Seeds", "DRY_GOODS", "1 lb bag", 1, "lb", 4.99, 100, "Restaurant Depot", { gramsPerMl: 0.6 }],
    ["Black Truffle Oil", "SPECIALTY", "8.45 fl oz bottle", 8.45, "floz", 19.99, 100, "Whole Foods", { gramsPerMl: 0.91 }],
    // Bakery
    ["Brioche Loaf", "BAKERY", "loaf", 1, "ea", 6.99, 100, "Publix", { gramsPerEach: 450 }],
    ["Sourdough Boule", "BAKERY", "loaf", 1, "ea", 7.99, 100, "Whole Foods", { gramsPerEach: 680 }],
  ];
  // Usually on hand — shown as "check pantry" rather than added to the buy list.
  const pantry = new Set(["Kosher Salt (Diamond)", "Black Peppercorns", "Extra Virgin Olive Oil", "Canola Oil", "All-Purpose Flour",
    "Granulated Sugar", "Soy Sauce", "Mirin", "Rice Vinegar", "Toasted Sesame Oil", "Dijon Mustard", "Honey", "Vanilla Bean Paste",
    "Balsamic Glaze", "Sesame Seeds", "Black Truffle Oil"]);
  const ing: Record<string, string> = {};
  for (const [name, category, purchaseUnit, packageQty, packageUnit, price, yieldPct, vendor, extra] of ingredientData) {
    ing[name] = (await db.ingredient.create({
      data: {
        name, category, purchaseUnit, packageQty, packageUnit, packagePriceCents: $(price), yieldPct, isPantryStaple: pantry.has(name),
        preferredVendorId: vendors[vendor], gramsPerMl: extra?.gramsPerMl, gramsPerEach: extra?.gramsPerEach,
        notes: extra?.notes, priceUpdatedAt: day(-Math.floor(Math.random() * 40)),
      },
    })).id;
  }

  // ─── Recipes ─────────────────────────────────────────────────────────────
  type Line = [ingredient: string, qty: number, unit: string, note?: string, scaling?: [ScalingMode, number, string?]];
  interface R {
    name: string; category: RecipeCategory; yieldPortions: number; yieldDescription?: string; phase: PrepPhase;
    prep?: number; cook?: number; allergens?: string[]; dietary?: string[]; equipment?: string; method: string[];
    holding?: string; reheating?: string; transport?: string; plating?: string; notes?: string; lines: Line[];
  }
  const SALT: Line = ["Kosher Salt (Diamond)", 1, "tsp", undefined, ["PARTIAL", 0.7, "Season to taste — large batches need less per portion."]];
  const recipesData: R[] = [
    {
      name: "Miso-Marinated Sea Bass", category: "PROTEIN", yieldPortions: 8, yieldDescription: "8 × 6 oz portions",
      phase: "DAY_BEFORE", prep: 20, cook: 12, allergens: ["Fish", "Soy"], dietary: ["Dairy-Free"],
      equipment: "Half sheet pans, broiler", method: [
        "Whisk miso, mirin, sugar and wine until smooth.",
        "Pat fish dry, portion to 6 oz, coat completely in marinade.",
        "Marinate covered 24–48 hours.",
        "Wipe off excess marinade, roast at 425°F for 8–10 minutes, then broil until caramelized.",
      ],
      holding: "Hold marinated raw fish at or below 38°F up to 48 hours.", transport: "Transport in marinade, on ice, in a sealed hotel pan.",
      plating: "Glazed side up over rice; spoon sauce around, not over.",
      lines: [
        ["Chilean Sea Bass Fillet", 3, "lb", "6 oz portions, skin off"],
        ["White Miso", 0.5, "cup"], ["Mirin", 3, "tbsp"], ["Granulated Sugar", 2, "tbsp"], ["Dry White Wine", 2, "tbsp", "sake if available"],
      ],
    },
    {
      name: "Ginger-Soy Beurre Blanc", category: "SAUCE", yieldPortions: 12, yieldDescription: "about 3 cups",
      phase: "ON_SITE", prep: 10, cook: 20, allergens: ["Dairy", "Soy"], dietary: ["Vegetarian", "Gluten-Free Option"],
      method: [
        "Reduce shallot, ginger, wine and vinegar to about 2 tablespoons.",
        "Add cream, reduce by half.",
        "Over low heat, whisk in cold butter a few cubes at a time.",
        "Season with soy; strain. Hold warm, never boiling.",
      ],
      holding: "Hold in a warm (not hot) spot or thermos up to 2 hours.", reheating: "Do not reheat directly; it will break.",
      notes: "If it breaks, whisk into a splash of reduced cream.",
      lines: [
        ["Shallots", 2, "ea", "minced"], ["Ginger", 1, "oz", "sliced"], ["Dry White Wine", 0.5, "cup"], ["Rice Vinegar", 0.25, "cup"],
        ["Heavy Cream", 0.25, "cup"], ["Unsalted Butter", 1, "lb", "cold, cubed"], ["Soy Sauce", 2, "tbsp", undefined, ["PARTIAL", 0.8, "Add soy gradually — reductions concentrate salt."]],
      ],
    },
    {
      name: "Forbidden Rice", category: "STARCH", yieldPortions: 8, phase: "EVENT_MORNING", prep: 5, cook: 35,
      dietary: ["Vegetarian", "Gluten-Free"], allergens: ["Dairy"],
      method: ["Rinse rice.", "Simmer in salted water 30–35 minutes until tender.", "Drain, fold in butter and scallions."],
      holding: "Holds well in a covered hotel pan up to 1 hour.", reheating: "Steam or microwave with a splash of water.",
      lines: [["Forbidden Black Rice", 2, "cup"], ["Unsalted Butter", 2, "tbsp"], ["Scallions", 1, "bunch", "thin bias"], SALT],
    },
    {
      name: "Sesame Vegetables", category: "VEGETABLE", yieldPortions: 8, phase: "ON_SITE", prep: 15, cook: 8,
      allergens: ["Sesame"], dietary: ["Vegan", "Gluten-Free"],
      method: ["Halve bok choy, bias-cut carrots.", "Sear hard in a wok or rondeau.", "Finish with garlic, sesame oil and seeds."],
      lines: [["Baby Bok Choy", 1.5, "lb"], ["Heirloom Carrots", 0.75, "lb"], ["Garlic, peeled", 3, "ea", "cloves, sliced"],
        ["Toasted Sesame Oil", 2, "tbsp"], ["Sesame Seeds", 1, "tbsp"], SALT],
    },
    {
      name: "Roasted Beef Tenderloin", category: "PROTEIN", yieldPortions: 8, yieldDescription: "8 × 6 oz portions",
      phase: "DAY_BEFORE", prep: 30, cook: 40, dietary: ["Gluten-Free"], allergens: ["Dairy"],
      equipment: "Roasting rack, probe thermometer, butcher twine",
      method: ["Trim silverskin & chain; tie.", "Season generously; rest uncovered overnight.", "Sear all sides, roast at 400°F to 125°F internal.", "Baste with butter, garlic, thyme; rest 15 minutes before slicing."],
      transport: "Transport trimmed & tied, raw, on ice.", plating: "Two slices shingled over purée.",
      lines: [["Beef Tenderloin (PSMO)", 3, "lb", "trimmed weight"], ["Kosher Salt (Diamond)", 1, "tbsp", undefined, ["PARTIAL", 0.85]],
        ["Black Peppercorns", 2, "tsp", "cracked", ["PARTIAL", 0.7]], ["Fresh Thyme", 0.25, "oz"], ["Garlic, peeled", 4, "ea"],
        ["Unsalted Butter", 4, "tbsp"], ["Canola Oil", 2, "tbsp", undefined, ["FIXED", 1, "Enough to coat the pan; doesn't scale with batch."]]],
    },
    {
      name: "Red Wine Demi-Glace", category: "SAUCE", yieldPortions: 12, yieldDescription: "about 3 cups", phase: "TWO_DAYS",
      prep: 10, cook: 45, allergens: ["Dairy"], dietary: ["Gluten-Free"],
      method: ["Sweat shallots, add thyme.", "Reduce red wine by two-thirds.", "Add demi-glace, simmer to nappe.", "Mount with butter to order."],
      holding: "Keeps 5 days refrigerated.", reheating: "Warm gently; mount butter just before service.",
      lines: [["Shallots", 3, "ea"], ["Dry Red Wine", 1.5, "cup"], ["Veal Demi-Glace", 8, "oz"], ["Unsalted Butter", 3, "tbsp"], ["Fresh Thyme", 0.1, "oz"]],
    },
    {
      name: "Yukon Gold Potato Purée", category: "STARCH", yieldPortions: 10, phase: "EVENT_MORNING", prep: 15, cook: 30,
      allergens: ["Dairy"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Simmer peeled potatoes from cold salted water.", "Rice while hot.", "Fold in hot cream and butter; pass through tamis for service."],
      holding: "Hold covered in a bain-marie up to 2 hours.", reheating: "Rewarm with a splash of cream, stirring.",
      lines: [["Yukon Gold Potatoes", 4, "lb"], ["Heavy Cream", 1.5, "cup"], ["Unsalted Butter", 0.5, "lb"], SALT],
    },
    {
      name: "Charred Asparagus", category: "VEGETABLE", yieldPortions: 8, phase: "ON_SITE", prep: 10, cook: 8,
      dietary: ["Vegan", "Gluten-Free"],
      method: ["Snap woody ends.", "Toss with oil and salt.", "Char on grill or cast iron; finish with lemon zest."],
      lines: [["Asparagus", 2, "lb"], ["Extra Virgin Olive Oil", 2, "tbsp"], ["Lemons", 1, "ea", "zest & juice"], SALT],
    },
    {
      name: "Burrata & Heirloom Tomato", category: "SALAD", yieldPortions: 8, phase: "ON_SITE", prep: 20,
      allergens: ["Dairy"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Cut tomatoes in varied shapes; salt 10 minutes.", "Tear burrata over.", "Finish with oil, glaze, torn basil, flaky salt."],
      plating: "Build on chilled plates just before service.",
      lines: [["Burrata", 4, "ea", "4 oz balls, halved"], ["Heirloom Tomatoes", 2, "lb"], ["Extra Virgin Olive Oil", 0.25, "cup"],
        ["Balsamic Glaze", 2, "tbsp"], ["Fresh Basil", 0.5, "oz"], SALT],
    },
    {
      name: "Seared Diver Scallops", category: "PROTEIN", yieldPortions: 8, yieldDescription: "3 scallops per portion",
      phase: "ON_SITE", prep: 10, cook: 6, allergens: ["Shellfish", "Dairy"], dietary: ["Gluten-Free"],
      method: ["Remove side muscle; dry on towels in the fridge.", "Sear in smoking oil 2 minutes.", "Flip, baste with butter 30 seconds."],
      lines: [["U10 Dry Sea Scallops", 1.5, "lb"], ["Unsalted Butter", 3, "tbsp"], ["Canola Oil", 2, "tbsp", undefined, ["FIXED", 1]], SALT],
    },
    {
      name: "Butternut Squash Purée", category: "VEGETABLE", yieldPortions: 12, phase: "DAY_BEFORE", prep: 15, cook: 45,
      allergens: ["Dairy"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Roast squash until very tender.", "Blend with butter, cream and maple until silky.", "Season; pass through chinois."],
      holding: "Keeps 3 days.", reheating: "Warm in a saucepan; adjust with cream.",
      lines: [["Butternut Squash", 3, "lb"], ["Unsalted Butter", 4, "tbsp"], ["Heavy Cream", 0.5, "cup"], ["Maple Syrup", 2, "tbsp"], SALT],
    },
    {
      name: "Pistachio Gremolata", category: "GARNISH", yieldPortions: 16, phase: "DAY_BEFORE", prep: 15,
      allergens: ["Tree Nuts"], dietary: ["Vegan", "Gluten-Free"],
      method: ["Toast and chop pistachios.", "Combine with parsley, lemon zest and oil. Season."],
      lines: [["Shelled Pistachios", 1, "cup"], ["Italian Parsley", 1, "bunch"], ["Lemons", 1, "ea", "zest"], ["Extra Virgin Olive Oil", 3, "tbsp"]],
    },
    {
      name: "Yellowfin Tuna Crudo", category: "PROTEIN", yieldPortions: 8, phase: "ON_SITE", prep: 25,
      allergens: ["Fish", "Soy", "Sesame"], dietary: ["Dairy-Free"],
      method: ["Slice tuna against the grain, ¼ inch.", "Whisk soy, lime and sesame oil.", "Fan tuna, spoon dressing, finish with chile, avocado and microgreens."],
      holding: "Slice no more than 30 minutes before service; keep on ice.",
      lines: [["Sushi-Grade Yellowfin Tuna", 1, "lb"], ["Soy Sauce", 3, "tbsp"], ["Limes", 2, "ea"], ["Toasted Sesame Oil", 1, "tbsp"],
        ["Fresno Chiles", 0.1, "lb", "paper-thin"], ["Avocados", 1, "ea"], ["Microgreens", 0.5, "oz"]],
    },
    {
      name: "Potato Blini", category: "BAKED", yieldPortions: 24, yieldDescription: "24 two-inch blini", phase: "DAY_BEFORE",
      prep: 20, cook: 25, allergens: ["Gluten", "Egg", "Dairy"], dietary: ["Vegetarian"],
      method: ["Rice cooked potatoes; cool.", "Whisk in flour, eggs and milk to a thick batter.", "Griddle 2-inch rounds in butter."],
      reheating: "Re-crisp 4 minutes at 350°F.",
      lines: [["Yukon Gold Potatoes", 0.5, "lb"], ["All-Purpose Flour", 0.25, "cup"], ["Large Eggs", 2, "ea"], ["Whole Milk", 0.25, "cup"], ["Unsalted Butter", 2, "tbsp"]],
    },
    {
      name: "Crème Fraîche & Caviar Garnish", category: "GARNISH", yieldPortions: 24, phase: "ON_SITE", prep: 15,
      allergens: ["Fish", "Dairy"],
      method: ["Pipe a dot of crème fraîche.", "Top with caviar using a mother-of-pearl spoon.", "Finish with a chive tip."],
      lines: [["Crème Fraîche", 4, "oz"], ["Osetra Caviar", 1, "oz"], ["Chives", 0.5, "bunch"]],
    },
    {
      name: "Dark Chocolate Pots de Crème", category: "DESSERT", yieldPortions: 10, phase: "DAY_BEFORE", prep: 20, cook: 40,
      allergens: ["Dairy", "Egg"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Scald cream and milk; pour over chocolate.", "Temper into yolks and sugar.", "Bake in water bath at 300°F until just set.", "Chill at least 6 hours."],
      holding: "Keeps 3 days covered.", transport: "Transport in a single layer, covered, chilled.",
      lines: [["Dark Chocolate 70%", 10, "oz"], ["Heavy Cream", 2.5, "cup"], ["Whole Milk", 0.5, "cup"], ["Large Eggs", 6, "ea", "yolks only"],
        ["Granulated Sugar", 0.33, "cup"], ["Vanilla Bean Paste", 1, "tsp"], ["Kosher Salt (Diamond)", 0.25, "tsp", undefined, ["FIXED", 1]]],
    },
    {
      name: "Chantilly Cream", category: "DESSERT", yieldPortions: 16, phase: "ON_SITE", prep: 10,
      allergens: ["Dairy"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Whip cold cream with sugar and vanilla to soft peaks."],
      lines: [["Heavy Cream", 2, "cup"], ["Granulated Sugar", 2, "tbsp"], ["Vanilla Bean Paste", 1, "tsp"]],
    },
    {
      name: "Macerated Berries", category: "DESSERT", yieldPortions: 10, phase: "EVENT_MORNING", prep: 10,
      dietary: ["Vegan", "Gluten-Free"],
      method: ["Halve strawberries; toss berries with sugar and lemon. Rest 30 minutes."],
      lines: [["Mixed Berries", 1.25, "lb"], ["Granulated Sugar", 2, "tbsp"], ["Lemons", 0.5, "ea"]],
    },
    {
      name: "Soft Scrambled Eggs", category: "PROTEIN", yieldPortions: 10, phase: "ON_SITE", prep: 5, cook: 12,
      allergens: ["Egg", "Dairy"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Whisk eggs well.", "Cook low and slow with butter, stirring constantly.", "Finish off heat with crème fraîche and chives."],
      holding: "Best cooked in batches of 10; holds 10 minutes in a chafer.",
      lines: [["Large Eggs", 25, "ea"], ["Unsalted Butter", 4, "tbsp"], ["Crème Fraîche", 4, "oz"], ["Chives", 1, "bunch"], SALT],
    },
    {
      name: "Brioche French Toast", category: "BAKED", yieldPortions: 10, phase: "EVENT_MORNING", prep: 20, cook: 30,
      allergens: ["Gluten", "Egg", "Dairy"], dietary: ["Vegetarian"],
      method: ["Slice brioche 1 inch thick.", "Soak in custard 30 seconds per side.", "Griddle in butter; finish in 350°F oven.", "Serve with warm maple and berries."],
      holding: "Holds 20 minutes covered in a chafer.",
      lines: [["Brioche Loaf", 2, "ea"], ["Large Eggs", 8, "ea"], ["Whole Milk", 2, "cup"], ["Heavy Cream", 1, "cup"],
        ["Granulated Sugar", 0.25, "cup"], ["Vanilla Bean Paste", 1, "tbsp"], ["Maple Syrup", 1.5, "cup"], ["Unsalted Butter", 4, "tbsp"], ["Mixed Berries", 1, "lb"]],
    },
    {
      name: "Maple-Glazed Thick-Cut Bacon", category: "PROTEIN", yieldPortions: 10, phase: "ON_SITE", cook: 25,
      dietary: ["Gluten-Free", "Dairy-Free"],
      method: ["Lay bacon on racks over sheet pans.", "Bake at 400°F 18 minutes.", "Brush with maple; bake 5 more minutes."],
      lines: [["Thick-Cut Bacon", 2.5, "lb"], ["Maple Syrup", 3, "tbsp"]],
    },
    {
      name: "Smashed Avocado Tartine", category: "BAKED", yieldPortions: 10, phase: "ON_SITE", prep: 20,
      allergens: ["Gluten"], dietary: ["Vegan"],
      method: ["Grill sourdough slices.", "Smash avocado with lemon, oil and salt.", "Top with fresno and microgreens; cut into thirds."],
      lines: [["Sourdough Boule", 1, "ea"], ["Avocados", 5, "ea"], ["Lemons", 1, "ea"], ["Fresno Chiles", 0.05, "lb"],
        ["Microgreens", 0.5, "oz"], ["Extra Virgin Olive Oil", 3, "tbsp"], SALT],
    },
    {
      name: "Lemon-Parmesan Arugula Salad", category: "SALAD", yieldPortions: 10, phase: "ON_SITE", prep: 15,
      allergens: ["Dairy", "Mustard"], dietary: ["Vegetarian", "Gluten-Free"],
      method: ["Whisk lemon, dijon, honey and oil.", "Dress arugula lightly just before service.", "Shave parmesan over."],
      lines: [["Baby Arugula", 0.75, "lb"], ["Lemons", 2, "ea"], ["Extra Virgin Olive Oil", 0.33, "cup"], ["Dijon Mustard", 1, "tbsp"],
        ["Honey", 1, "tbsp"], ["Parmigiano-Reggiano", 3, "oz"], SALT],
    },
    {
      name: "Lemon-Herb Chicken Thighs", category: "PROTEIN", yieldPortions: 10, yieldDescription: "10 × 6 oz portions",
      phase: "DAY_BEFORE", prep: 20, cook: 25, dietary: ["Gluten-Free", "Dairy-Free"],
      method: ["Marinate thighs overnight in lemon, garlic, oil and herbs.", "Grill or sear skin-side down; finish at 400°F to 175°F."],
      holding: "Holds 45 minutes covered in a chafer with a little jus.",
      lines: [["Boneless Chicken Thighs", 3.75, "lb"], ["Lemons", 2, "ea"], ["Garlic, peeled", 6, "ea"], ["Extra Virgin Olive Oil", 0.33, "cup"],
        ["Fresh Thyme", 0.25, "oz"], ["Italian Parsley", 0.5, "bunch"], SALT],
    },
    {
      name: "Red Wine Braised Short Ribs", category: "PROTEIN", yieldPortions: 8, phase: "TWO_DAYS", prep: 40, cook: 210,
      allergens: ["Gluten"], dietary: ["Dairy-Free"],
      method: ["Season and dredge ribs; sear deeply.", "Sweat mirepoix; deglaze with wine and reduce by half.", "Add stock and demi; braise covered at 300°F for 3½ hours.", "Cool in liquid overnight; lift fat, reduce braising liquid to glaze."],
      holding: "Better on day two. Keeps 4 days in braising liquid.", reheating: "Covered at 325°F in liquid for 35–40 minutes.",
      lines: [["Bone-In Short Ribs", 6, "lb"], ["Dry Red Wine", 2, "cup"], ["Yellow Onions", 2, "ea"], ["Heirloom Carrots", 0.5, "lb"],
        ["Garlic, peeled", 6, "ea"], ["Chicken Stock", 1, "qt"], ["Veal Demi-Glace", 4, "oz"], ["Fresh Thyme", 0.25, "oz"],
        ["All-Purpose Flour", 0.25, "cup"], ["Kosher Salt (Diamond)", 1, "tbsp", undefined, ["PARTIAL", 0.8]]],
    },
    {
      name: "Honey-Roasted Heirloom Carrots", category: "VEGETABLE", yieldPortions: 10, phase: "EVENT_MORNING", prep: 15, cook: 25,
      dietary: ["Vegetarian", "Gluten-Free", "Dairy-Free"],
      method: ["Halve carrots lengthwise.", "Toss with honey, oil and thyme.", "Roast at 425°F until caramelized."],
      lines: [["Heirloom Carrots", 2.5, "lb"], ["Honey", 2, "tbsp"], ["Extra Virgin Olive Oil", 2, "tbsp"], ["Fresh Thyme", 0.1, "oz"], SALT],
    },
    {
      name: "Wild Mushroom Risotto", category: "STARCH", yieldPortions: 8, phase: "ON_SITE", prep: 20, cook: 35,
      allergens: ["Dairy"], dietary: ["Gluten-Free", "Vegetarian Option"],
      method: ["Sear mushrooms hard; set aside.", "Toast rice with shallot; deglaze with wine.", "Add hot stock gradually, stirring.", "Finish with butter, parmesan, mushrooms and a few drops of truffle oil."],
      holding: "Par-cook to 70% up to 3 hours ahead; finish to order.",
      notes: "Swap vegetable stock to make vegetarian.",
      lines: [["Arborio Rice", 2, "cup"], ["Wild Mushroom Blend", 1.5, "lb"], ["Shallots", 3, "ea"], ["Dry White Wine", 0.75, "cup"],
        ["Chicken Stock", 2, "qt"], ["Unsalted Butter", 4, "tbsp"], ["Parmigiano-Reggiano", 4, "oz"],
        ["Black Truffle Oil", 1, "tbsp", undefined, ["PARTIAL", 0.5, "Truffle oil gets overpowering fast — taste as you scale."]]],
    },
    {
      name: "Herb-Crusted Salmon", category: "PROTEIN", yieldPortions: 10, yieldDescription: "10 × 6 oz portions", phase: "EVENT_MORNING",
      prep: 25, cook: 15, allergens: ["Fish", "Gluten", "Mustard", "Dairy"],
      method: ["Portion salmon.", "Brush with dijon; press on panko-herb-butter crust.", "Roast at 425°F 10–12 minutes."],
      holding: "Holds 30 minutes; crust softens in a covered chafer — vent the lid.",
      lines: [["Salmon Fillet (Faroe Islands)", 3.75, "lb"], ["Dijon Mustard", 3, "tbsp"], ["Panko Breadcrumbs", 0.75, "cup"],
        ["Italian Parsley", 0.5, "bunch"], ["Lemons", 1, "ea"], ["Unsalted Butter", 3, "tbsp"]],
    },
    {
      name: "Mini Crab Cakes", category: "PROTEIN", yieldPortions: 24, yieldDescription: "24 one-bite cakes", phase: "DAY_BEFORE",
      prep: 30, cook: 15, allergens: ["Shellfish", "Egg", "Gluten", "Mustard"],
      method: ["Gently fold crab with binder.", "Portion 1 oz; chill to set overnight.", "Sear to order; finish in oven."],
      transport: "Transport formed & raw on a parchment-lined sheet tray, covered, on ice.",
      lines: [["Jumbo Lump Crab", 1, "lb"], ["Panko Breadcrumbs", 0.5, "cup"], ["Large Eggs", 1, "ea"], ["Dijon Mustard", 1, "tbsp"],
        ["Chives", 0.25, "bunch"], ["Lemons", 1, "ea"], ["Canola Oil", 0.25, "cup", undefined, ["PARTIAL", 0.4, "Pan oil — replenish between batches rather than scaling."]]],
    },
    {
      name: "Spicy Tuna Maki", category: "PROTEIN", yieldPortions: 10, yieldDescription: "10 rolls (8 pieces each)", phase: "ON_SITE",
      prep: 45, cook: 25, allergens: ["Fish", "Soy", "Sesame"], dietary: ["Dairy-Free"], equipment: "Rice cooker, bamboo mats, hangiri",
      method: ["Cook and season sushi rice; cool to body temp.", "Dice tuna; dress with a little soy and sesame.", "Demonstrate roll; guests roll their own."],
      notes: "Cooking class: pre-portion rice balls at 150 g per roll to keep class moving.",
      lines: [["Sushi Rice", 3, "cup"], ["Rice Vinegar", 0.33, "cup"], ["Granulated Sugar", 2, "tbsp"], ["Nori Sheets", 10, "sheet"],
        ["Sushi-Grade Yellowfin Tuna", 1.25, "lb"], ["English Cucumbers", 2, "ea"], ["Avocados", 2, "ea"], ["Sesame Seeds", 2, "tbsp"],
        ["Soy Sauce", 2, "tbsp"], ["Kosher Salt (Diamond)", 1, "tsp", undefined, ["FIXED", 1]]],
    },
  ];
  const rec: Record<string, string> = {};
  for (const r of recipesData) {
    rec[r.name] = (await db.recipe.create({
      data: {
        name: r.name, category: r.category, yieldPortions: r.yieldPortions, yieldDescription: r.yieldDescription,
        method: r.method.join("\n"), prepMinutes: r.prep, cookMinutes: r.cook, equipment: r.equipment,
        allergens: r.allergens ?? [], dietaryTags: r.dietary ?? [], holdingInstructions: r.holding,
        reheatingInstructions: r.reheating, transportNotes: r.transport, platingInstructions: r.plating,
        chefNotes: r.notes, defaultPrepPhase: r.phase,
        ingredients: {
          create: r.lines.map(([name, quantity, unit, prepNote, scaling], i) => ({
            ingredientId: ing[name], quantity, unit, prepNote, sortOrder: i,
            scalingMode: scaling?.[0] ?? "LINEAR", scalingFactor: scaling?.[1] ?? 1, scalingNote: scaling?.[2],
          })),
        },
      },
    })).id;
  }

  // ─── Dishes ──────────────────────────────────────────────────────────────
  interface D {
    name: string; description: string; course: Course; cuisine: string; protein?: string; dietary?: string[]; allergens?: string[];
    styles: ServiceStyle[]; difficulty?: "LOW" | "MEDIUM" | "HIGH"; prep?: "LOW" | "MEDIUM" | "HIGH"; plating?: "LOW" | "MEDIUM" | "HIGH";
    holding?: "POOR" | "FAIR" | "GOOD" | "EXCELLENT"; notes?: string; components: [recipe: string, portions: number][];
  }
  const dishesData: D[] = [
    { name: "Miso-Glazed Chilean Sea Bass", description: "Ginger-soy beurre blanc, forbidden rice, sesame vegetables, scallion", course: "ENTREE", cuisine: "Japanese-Inspired",
      protein: "Seafood", allergens: ["Fish", "Soy", "Dairy", "Sesame"], dietary: ["Gluten-Free Option"], styles: ["PLATED"], difficulty: "HIGH", prep: "MEDIUM", plating: "MEDIUM", holding: "FAIR",
      notes: "Signature dish. Order fish 48h ahead from Casablanca.", components: [["Miso-Marinated Sea Bass", 1], ["Ginger-Soy Beurre Blanc", 1], ["Forbidden Rice", 1], ["Sesame Vegetables", 1]] },
    { name: "Beef Tenderloin, Red Wine Demi", description: "Yukon gold purée, charred asparagus, thyme", course: "ENTREE", cuisine: "French", protein: "Beef",
      allergens: ["Dairy"], dietary: ["Gluten-Free"], styles: ["PLATED", "FAMILY_STYLE"], difficulty: "MEDIUM", prep: "MEDIUM", plating: "LOW", holding: "GOOD",
      components: [["Roasted Beef Tenderloin", 1], ["Red Wine Demi-Glace", 1], ["Yukon Gold Potato Purée", 1], ["Charred Asparagus", 1]] },
    { name: "Heirloom Tomato & Burrata", description: "Basil, aged balsamic, olive oil, flaky salt", course: "APPETIZER", cuisine: "Italian",
      dietary: ["Vegetarian", "Gluten-Free"], allergens: ["Dairy"], styles: ["PLATED", "FAMILY_STYLE"], difficulty: "LOW", prep: "LOW", plating: "MEDIUM", holding: "POOR",
      components: [["Burrata & Heirloom Tomato", 1]] },
    { name: "Seared Diver Scallops", description: "Butternut squash purée, pistachio gremolata, brown butter", course: "APPETIZER", cuisine: "Modern American", protein: "Shellfish",
      allergens: ["Shellfish", "Dairy", "Tree Nuts"], dietary: ["Gluten-Free"], styles: ["PLATED"], difficulty: "HIGH", prep: "MEDIUM", plating: "HIGH", holding: "POOR",
      components: [["Seared Diver Scallops", 1], ["Butternut Squash Purée", 1], ["Pistachio Gremolata", 1]] },
    { name: "Yellowfin Tuna Crudo", description: "Citrus-soy, fresno chile, avocado, microgreens", course: "APPETIZER", cuisine: "Japanese-Inspired", protein: "Seafood",
      allergens: ["Fish", "Soy", "Sesame"], dietary: ["Dairy-Free"], styles: ["PLATED", "PASSED"], difficulty: "MEDIUM", prep: "LOW", plating: "HIGH", holding: "POOR",
      components: [["Yellowfin Tuna Crudo", 1]] },
    { name: "Potato Blini, Crème Fraîche & Osetra", description: "Crisp potato blini, cultured cream, caviar, chive", course: "WELCOME_BITE", cuisine: "French",
      protein: "Seafood", allergens: ["Fish", "Dairy", "Egg", "Gluten"], styles: ["PASSED"], difficulty: "MEDIUM", prep: "MEDIUM", plating: "MEDIUM", holding: "FAIR",
      components: [["Potato Blini", 1], ["Crème Fraîche & Caviar Garnish", 1]] },
    { name: "Mini Crab Cakes", description: "Jumbo lump crab, lemon, chive", course: "PASSED_APPETIZER", cuisine: "Coastal American", protein: "Shellfish",
      allergens: ["Shellfish", "Egg", "Gluten", "Mustard"], styles: ["PASSED", "BUFFET"], difficulty: "MEDIUM", prep: "MEDIUM", plating: "LOW", holding: "GOOD",
      components: [["Mini Crab Cakes", 1]] },
    { name: "Dark Chocolate Pot de Crème", description: "Vanilla chantilly, macerated berries", course: "DESSERT", cuisine: "French",
      allergens: ["Dairy", "Egg"], dietary: ["Vegetarian", "Gluten-Free"], styles: ["PLATED", "BUFFET", "DROP_OFF"], difficulty: "LOW", prep: "MEDIUM", plating: "LOW", holding: "EXCELLENT",
      components: [["Dark Chocolate Pots de Crème", 1], ["Chantilly Cream", 1], ["Macerated Berries", 1]] },
    { name: "Soft Scrambled Eggs", description: "Crème fraîche, chives", course: "ENTREE", cuisine: "Brunch", protein: "Egg",
      allergens: ["Egg", "Dairy"], dietary: ["Vegetarian", "Gluten-Free"], styles: ["FAMILY_STYLE", "BUFFET"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "FAIR",
      components: [["Soft Scrambled Eggs", 1]] },
    { name: "Brioche French Toast", description: "Warm maple, macerated berries", course: "ENTREE", cuisine: "Brunch",
      allergens: ["Gluten", "Egg", "Dairy"], dietary: ["Vegetarian"], styles: ["FAMILY_STYLE", "BUFFET"], difficulty: "LOW", prep: "MEDIUM", plating: "LOW", holding: "GOOD",
      components: [["Brioche French Toast", 1]] },
    { name: "Maple-Glazed Thick-Cut Bacon", description: "Applewood-smoked, maple lacquer", course: "SIDE", cuisine: "Brunch", protein: "Pork",
      dietary: ["Gluten-Free", "Dairy-Free"], styles: ["FAMILY_STYLE", "BUFFET"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "GOOD",
      components: [["Maple-Glazed Thick-Cut Bacon", 1]] },
    { name: "Smashed Avocado Tartine", description: "Grilled sourdough, fresno, lemon, microgreens", course: "APPETIZER", cuisine: "Brunch",
      allergens: ["Gluten"], dietary: ["Vegan"], styles: ["FAMILY_STYLE", "BUFFET", "PASSED"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "FAIR",
      components: [["Smashed Avocado Tartine", 1]] },
    { name: "Lemon-Parmesan Arugula Salad", description: "Shaved Parmigiano, lemon-dijon vinaigrette", course: "SALAD", cuisine: "Italian",
      allergens: ["Dairy", "Mustard"], dietary: ["Vegetarian", "Gluten-Free"], styles: ["PLATED", "FAMILY_STYLE", "BUFFET", "DROP_OFF"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "FAIR",
      notes: "Dress at the last moment; pack dressing separately for drop-off.", components: [["Lemon-Parmesan Arugula Salad", 1]] },
    { name: "Lemon-Herb Grilled Chicken", description: "Charred lemon, garlic, thyme, parsley", course: "ENTREE", cuisine: "Mediterranean", protein: "Chicken",
      dietary: ["Gluten-Free", "Dairy-Free"], styles: ["BUFFET", "FAMILY_STYLE", "DROP_OFF"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "EXCELLENT",
      components: [["Lemon-Herb Chicken Thighs", 1]] },
    { name: "Red Wine Braised Short Rib", description: "Yukon gold purée, honey-roasted heirloom carrots, braising jus", course: "ENTREE", cuisine: "Modern American", protein: "Beef",
      allergens: ["Gluten", "Dairy"], styles: ["PLATED", "BUFFET", "FAMILY_STYLE"], difficulty: "MEDIUM", prep: "HIGH", plating: "LOW", holding: "EXCELLENT",
      notes: "Braise 2 days ahead — better on day two.", components: [["Red Wine Braised Short Ribs", 1], ["Yukon Gold Potato Purée", 1], ["Honey-Roasted Heirloom Carrots", 1]] },
    { name: "Honey-Roasted Heirloom Carrots", description: "Thyme, wildflower honey", course: "SIDE", cuisine: "Modern American",
      dietary: ["Vegetarian", "Gluten-Free", "Dairy-Free"], styles: ["BUFFET", "FAMILY_STYLE", "DROP_OFF"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "EXCELLENT",
      components: [["Honey-Roasted Heirloom Carrots", 1]] },
    { name: "Wild Mushroom Risotto", description: "Parmigiano, black truffle, thyme", course: "ENTREE", cuisine: "Italian",
      allergens: ["Dairy"], dietary: ["Gluten-Free", "Vegetarian Option"], styles: ["PLATED", "STATIONS"], difficulty: "MEDIUM", prep: "LOW", plating: "LOW", holding: "POOR",
      components: [["Wild Mushroom Risotto", 1]] },
    { name: "Herb-Crusted Salmon", description: "Dijon, lemon, parsley crust", course: "ENTREE", cuisine: "Modern American", protein: "Seafood",
      allergens: ["Fish", "Gluten", "Mustard", "Dairy"], styles: ["BUFFET", "PLATED", "DROP_OFF"], difficulty: "LOW", prep: "LOW", plating: "LOW", holding: "GOOD",
      components: [["Herb-Crusted Salmon", 1]] },
    { name: "Hand-Rolled Spicy Tuna Maki", description: "Guests roll their own: yellowfin, cucumber, avocado, sesame", course: "ENTREE", cuisine: "Japanese", protein: "Seafood",
      allergens: ["Fish", "Soy", "Sesame"], dietary: ["Dairy-Free"], styles: ["INTERACTIVE"], difficulty: "MEDIUM", prep: "MEDIUM", plating: "LOW", holding: "POOR",
      components: [["Spicy Tuna Maki", 1]] },
  ];
  const dish: Record<string, string> = {};
  for (const d of dishesData) {
    dish[d.name] = (await db.dish.create({
      data: {
        name: d.name, description: d.description, course: d.course, cuisine: d.cuisine, protein: d.protein,
        dietaryTags: d.dietary ?? [], allergens: d.allergens ?? [], serviceStyles: d.styles,
        difficulty: d.difficulty ?? "MEDIUM", prepIntensity: d.prep ?? "MEDIUM", platingDifficulty: d.plating ?? "MEDIUM",
        holdingQuality: d.holding ?? "GOOD", chefNotes: d.notes,
        components: { create: d.components.map(([r, portionsPerServing], i) => ({ recipeId: rec[r], portionsPerServing, sortOrder: i })) },
      },
    })).id;
  }

  // ─── Staff ───────────────────────────────────────────────────────────────
  const staffData: [string, StaffRole, number, "HOURLY" | "FLAT", string, string, string?, string?][] = [
    ["Marisol Vega", "SOUS_CHEF", 35, "HOURLY", "(305) 555-0142", "marisol.vega@example.com", "Weekends preferred; not available Mondays.", "Rock solid. Can run a line solo."],
    ["Jonah Fields", "CHEF", 350, "FLAT", "(786) 555-0199", "jonah.fields@example.com", "Freelance; book 2+ weeks out.", "Great with large buffets."],
    ["DeShawn Carter", "SERVER", 28, "HOURLY", "(305) 555-0177", "deshawn.c@example.com", "Evenings & weekends.", "Clients love him. Polished."],
    ["Hannah Liu", "SERVER", 28, "HOURLY", "(954) 555-0120", "hannah.liu@example.com", "Full-time student; weekends only.", "Reliable; wine knowledge."],
    ["Rafael Ortiz", "KITCHEN_ASSISTANT", 22, "HOURLY", "(305) 555-0164", "rafa.ortiz@example.com", "Flexible.", "Fast prep cook. Needs direction on plating."],
    ["Tasha Greene", "BARTENDER", 32, "HOURLY", "(786) 555-0108", "tasha.greene@example.com", "Has her own bar kit.", "Licensed & insured."],
    ["Leo Marchetti", "CAPTAIN", 40, "HOURLY", "(305) 555-0133", "leo.marchetti@example.com", "Book early for weddings.", "Runs weddings flawlessly."],
    ["Brianna Cole", "DISHWASHER", 20, "HOURLY", "(954) 555-0151", "brianna.cole@example.com", "Evenings.", "Arrived late once (June)."],
  ];
  const staff: Record<string, string> = {};
  for (const [name, role, rate, rateType, phone, email, availabilityNotes, reliabilityNotes] of staffData) {
    staff[name] = (await db.staffMember.create({
      data: { name, role, rateCents: $(rate), rateType, phone, email, availabilityNotes, reliabilityNotes },
    })).id;
  }

  // ─── Equipment ───────────────────────────────────────────────────────────
  const equipmentData: [string, string, number, string, ("EXCELLENT" | "GOOD" | "FAIR" | "NEEDS_REPAIR")?, number?, string?][] = [
    ["Full-Size Chafing Dishes", "Service", 12, "Garage — Shelf A", "GOOD"],
    ["Induction Burners", "Cooking", 4, "Garage — Shelf B", "EXCELLENT"],
    ["Butane Burners", "Cooking", 3, "Garage — Shelf B", "GOOD"],
    ["Portable Flat-Top Griddle", "Cooking", 1, "Garage — Floor", "GOOD"],
    ["Countertop Fryer", "Cooking", 1, "Garage — Shelf B", "FAIR", 0, "Thermostat runs 10°F hot."],
    ["120 qt Coolers", "Transport", 3, "Garage — Floor", "GOOD"],
    ["48 qt Coolers", "Transport", 4, "Garage — Floor", "GOOD"],
    ["Cambro Insulated Carriers", "Transport", 4, "Garage — Shelf C", "EXCELLENT"],
    ["Full Hotel Pans", "Smallwares", 30, "Kitchen — Rack 1", "GOOD"],
    ["Half Hotel Pans", "Smallwares", 40, "Kitchen — Rack 1", "GOOD"],
    ["Full Sheet Pans", "Smallwares", 20, "Kitchen — Rack 2", "GOOD"],
    ["Half Sheet Pans", "Smallwares", 30, "Kitchen — Rack 2", "GOOD"],
    ["Serving Utensils", "Service", 60, "Bin 4", "GOOD"],
    ["Carving Station & Heat Lamp", "Service", 1, "Garage — Shelf A", "EXCELLENT"],
    ["Display Risers", "Service", 12, "Bin 7", "GOOD"],
    ["Black Linen Tablecloths 120\"", "Linens", 16, "Linen closet", "GOOD", 2, "Two have wax stains — send out."],
    ["White Porcelain Platters", "Service", 14, "Kitchen — Cabinet", "EXCELLENT"],
    ["Slate Serving Boards", "Service", 8, "Kitchen — Cabinet", "GOOD"],
    ["Compostable Dinnerware Sets", "Disposables", 300, "Garage — Shelf D", "GOOD"],
    ["Portable Bar Kit", "Bar", 2, "Garage — Shelf C", "GOOD"],
    ["Immersion Circulators", "Cooking", 2, "Kitchen — Drawer", "EXCELLENT"],
    ["Plating Kit (tweezers, ring molds, squeeze bottles)", "Smallwares", 2, "Knife bag", "EXCELLENT"],
  ];
  const equip: Record<string, string> = {};
  for (const [name, category, quantityOwned, storageLocation, condition, oos, notes] of equipmentData) {
    equip[name] = (await db.equipmentItem.create({
      data: { name, category, quantityOwned, storageLocation, condition: condition ?? "GOOD", quantityOutOfService: oos ?? 0, notes },
    })).id;
  }

  // ─── Clients & venues ────────────────────────────────────────────────────
  const client = async (data: Parameters<typeof db.client.create>[0]["data"]) => (await db.client.create({ data })).id;
  const venue = async (data: Parameters<typeof db.venue.create>[0]["data"]) => (await db.venue.create({ data })).id;

  const harper = await client({ name: "Ciara Harper", phone: "(305) 555-0101", email: "ciara.harper@example.com", preferredContact: "TEXT",
    allergies: "Marcus (husband): tree nuts — severe, carries EpiPen", dietaryRestrictions: "No pork at family events",
    likes: "Seafood, bright acidic flavors, anything with miso. Loves a champagne welcome.", dislikes: "Cilantro, blue cheese",
    importantNotes: "Prefers quiet service — hosts in the dining room with the doors open to the terrace.",
    internalNotes: "Tips generously. Great referral source — sent us the Delgados.", referralSource: "INSTAGRAM" });
  const moreno = await client({ name: "Isabel Moreno & James Whitfield", phone: "(786) 555-0112", email: "isabel.moreno@example.com", preferredContact: "EMAIL",
    dietaryRestrictions: "12 vegetarian guests; 2 gluten-free", likes: "Latin-Mediterranean, family-style warmth, live stations",
    importantNotes: "Planner is Camila Reyes (Reyes Events) — cc on everything.", referralSource: "PLANNER", referredBy: "Camila Reyes, Reyes Events" });
  const brightline = await client({ name: "Priya Raman", company: "Brightline Capital", phone: "(305) 555-0188", email: "praman@brightline.example.com",
    preferredContact: "EMAIL", dietaryRestrictions: "Always 3–4 vegetarian, 1 vegan", importantNotes: "Invoices go to accounts payable; Net 15. PO number required.",
    internalNotes: "Quarterly lunches — potential recurring revenue.", referralSource: "GOOGLE" });
  const delgado = await client({ name: "Sofia & Daniel Delgado", phone: "(305) 555-0123", email: "sofia.delgado@example.com", preferredContact: "TEXT",
    allergies: "Daughter Lucia (8): peanuts", likes: "Big family brunches, fresh fruit, French toast", dislikes: "Very spicy food",
    referralSource: "REFERRAL", referredBy: "Ciara Harper" });
  const okafor = await client({ name: "Nia Okafor", phone: "(954) 555-0145", email: "nia.okafor@example.com", preferredContact: "CALL",
    likes: "Steak, bold red wine, dark chocolate", importantNotes: "Anniversary is the same weekend every year — reach out in August.", referralSource: "WEBSITE" });
  const lumen = await client({ name: "Marcus Bell", company: "Lumen Health", phone: "(305) 555-0166", email: "mbell@lumenhealth.example.com",
    preferredContact: "EMAIL", referralSource: "REFERRAL", referredBy: "Priya Raman (Brightline)" });
  const marlowe = await client({ name: "Grant Marlowe", phone: "(786) 555-0190", email: "grant.marlowe@example.com", preferredContact: "TEXT",
    likes: "Wine pairing dinners; collects Burgundy", internalNotes: "Slow to pay last time — send balance reminder the day after.", referralSource: "GOOGLE" });
  const castellano = await client({ name: "The Castellano Family", phone: "(312) 555-0114", email: "rcastellano@example.com", preferredContact: "WHATSAPP",
    dietaryRestrictions: "Two kids (6, 9) — simple options", allergies: "Rob: shellfish", likes: "Fresh Keys seafood (not shellfish), grilled everything",
    referralSource: "AIRBNB" });
  const chen = await client({ name: "Olivia Chen", phone: "(305) 555-0137", email: "olivia.chen@example.com", preferredContact: "EMAIL",
    likes: "Seasonal, vegetable-forward", dietaryRestrictions: "Mother is vegetarian", referralSource: "INSTAGRAM" });
  const rosewood = await client({ name: "Elaine Porter", company: "Rosewood Book Club", phone: "(954) 555-0159", email: "elaine.porter@example.com",
    preferredContact: "EMAIL", likes: "Themed menus matched to the month’s book", referralSource: "REFERRAL", referredBy: "Nia Okafor" });
  const nakamura = await client({ name: "Kai Nakamura", phone: "(786) 555-0171", email: "kai.nakamura@example.com", preferredContact: "INSTAGRAM",
    importantNotes: "Birthday cooking class for friends — wants hands-on, casual, fun.", referralSource: "INSTAGRAM" });
  const seaview = await client({ name: "Tessa Grant", company: "Seaview Realty Group", phone: "(305) 555-0195", email: "tgrant@seaview.example.com",
    preferredContact: "EMAIL", referralSource: "GOOGLE" });

  const vHarper = await venue({ name: "Harper Residence", clientId: harper, address: "1418 Alhambra Circle", city: "Coral Gables", state: "FL", postalCode: "33134",
    parkingInstructions: "Park in the side driveway; service entrance through the garden gate.", gateCode: "4418#", contactName: "Ciara Harper", contactPhone: "(305) 555-0101",
    stoveType: "Wolf 48\" dual-fuel", burnerCount: 6, hasOven: true, ovenNotes: "Double wall oven + range oven", hasGrill: true, hasMicrowave: true,
    fridgeSpace: "MODERATE", freezerSpace: "LIMITED", counterSpace: "AMPLE", hasSink: true, hasDishwasher: true,
    cookware: "All-Clad set; one 12\" cast iron", sheetPans: "4 half sheets", servingPieces: "Ciara’s white platters in dining hutch",
    plates: "FULL", flatware: "FULL", glassware: "FULL", electricalNotes: "Don’t run induction burner and microwave on the island circuit together.",
    outdoorCooking: "Built-in gas grill on terrace" });
  const vGrove = await venue({ name: "The Grove at Redland", address: "24700 SW 177th Ave", city: "Homestead", state: "FL", postalCode: "33031",
    parkingInstructions: "Vendor lot behind the barn; load in via the gravel service road.", contactName: "Venue manager — Tomás", contactPhone: "(305) 555-0210",
    stoveType: "None — prep tent only", burnerCount: 0, hasOven: false, hasGrill: false, hasMicrowave: false, fridgeSpace: "NONE", freezerSpace: "NONE",
    counterSpace: "LIMITED", hasSink: true, hasDishwasher: false, cookware: "None", sheetPans: "None", servingPieces: "None",
    plates: "NONE", flatware: "NONE", glassware: "NONE", electricalNotes: "Two 20A circuits in the prep tent. Generator on request ($250).",
    outdoorCooking: "Open lawn; bring grills", otherNotes: "Rentals: plates, flatware, glassware through Party Rental Co." });
  const vBrightline = await venue({ name: "Brightline Capital — Brickell Office", clientId: brightline, address: "801 Brickell Ave, 22nd Floor", city: "Miami", state: "FL", postalCode: "33131",
    parkingInstructions: "Loading dock on SE 8th St; check in with security 15 min before.", contactName: "Priya Raman", contactPhone: "(305) 555-0188" });
  const vMarea = await venue({ name: "Casa Marea (Airbnb)", address: "81 Coral Rd", city: "Islamorada", state: "FL", postalCode: "33036",
    gateCode: "Guest will text on arrival", contactName: "Rob Castellano", contactPhone: "(312) 555-0114",
    hasGrill: true, outdoorCooking: "Large gas grill on the dock", otherNotes: "Host says kitchen is ‘fully stocked’ — confirm pans, oven and fridge space." });
  const vDelgado = await venue({ name: "Delgado Residence", clientId: delgado, address: "6200 SW 88th St", city: "Pinecrest", state: "FL", postalCode: "33156",
    parkingInstructions: "Circular drive", contactName: "Sofia Delgado", contactPhone: "(305) 555-0123", stoveType: "GE gas range", burnerCount: 5,
    hasOven: true, hasGrill: true, hasMicrowave: true, fridgeSpace: "LIMITED", freezerSpace: "MODERATE", counterSpace: "MODERATE", hasSink: true,
    hasDishwasher: true, cookware: "Basic set", sheetPans: "2 half sheets", servingPieces: "Bring platters", plates: "FULL", flatware: "FULL",
    glassware: "PARTIAL", electricalNotes: "None known", outdoorCooking: "Grill on patio" });
  const vOkafor = await venue({ name: "Okafor Residence", clientId: okafor, address: "3310 NE 29th Ave", city: "Fort Lauderdale", state: "FL", postalCode: "33308",
    contactName: "Nia Okafor", contactPhone: "(954) 555-0145", stoveType: "Induction", burnerCount: 4, hasOven: true, fridgeSpace: "MODERATE", counterSpace: "MODERATE",
    hasSink: true, hasDishwasher: true, plates: "FULL", flatware: "FULL", glassware: "FULL" });
  const vKampong = await venue({ name: "The Kampong Garden Pavilion", address: "4013 Douglas Rd", city: "Coconut Grove", state: "FL", postalCode: "33133",
    contactName: "Events office", contactPhone: "(305) 555-0230", stoveType: "Catering kitchen — 6 burner", burnerCount: 6, hasOven: true,
    fridgeSpace: "AMPLE", counterSpace: "AMPLE", hasSink: true, hasDishwasher: false, plates: "NONE", flatware: "NONE", glassware: "NONE" });
  const vMarlowe = await venue({ name: "Marlowe Residence", clientId: marlowe, address: "210 Palm Ave", city: "Miami Beach", state: "FL", postalCode: "33139",
    contactName: "Grant Marlowe", contactPhone: "(786) 555-0190", stoveType: "Viking gas", burnerCount: 6, hasOven: true, fridgeSpace: "AMPLE", counterSpace: "MODERATE",
    hasSink: true, hasDishwasher: true, plates: "FULL", flatware: "FULL", glassware: "FULL", otherNotes: "Wine fridge off-limits except for pairing bottles Grant sets out." });
  const vChen = await venue({ name: "Chen Residence", clientId: chen, address: "1590 Brickell Bay Dr, PH2", city: "Miami", state: "FL", postalCode: "33131",
    contactName: "Olivia Chen", contactPhone: "(305) 555-0137", stoveType: "Miele induction", burnerCount: 5, hasOven: true, fridgeSpace: "MODERATE" });
  const vPorter = await venue({ name: "Porter Residence", clientId: rosewood, address: "88 Isla Bahia Dr", city: "Fort Lauderdale", state: "FL", postalCode: "33316",
    contactName: "Elaine Porter", contactPhone: "(954) 555-0159" });
  const vNakamura = await venue({ name: "Nakamura Residence", clientId: nakamura, address: "2525 SW 3rd Ave, Apt 1804", city: "Miami", state: "FL", postalCode: "33129",
    contactName: "Kai Nakamura", contactPhone: "(786) 555-0171", stoveType: "Electric coil", burnerCount: 4, hasOven: true, fridgeSpace: "LIMITED",
    counterSpace: "LIMITED", hasSink: true, hasDishwasher: true, otherNotes: "Class happens at the dining table — bring cutting boards & mats." });
  const vSeaview = await venue({ name: "Seaview Realty — Las Olas Office", clientId: seaview, address: "401 E Las Olas Blvd", city: "Fort Lauderdale", state: "FL", postalCode: "33301" });

  // ─── Events ──────────────────────────────────────────────────────────────
  interface EventSeed {
    name: string; clientId: string; venueId?: string; platform?: string; eventType: EventType; serviceStyle: ServiceStyle;
    status: "INQUIRY" | "TENTATIVE" | "BOOKED" | "PLANNING" | "READY" | "COMPLETED" | "CANCELLED";
    offset: number; endOffset?: number; arrival?: string; service?: string; end?: string; guests: number; confirmed?: boolean;
    price: number; depositPct?: number; finalCountOffset?: number; depositDueOffset?: number; balanceDueOffset?: number;
    shoppingOffset?: number; prepOffset?: number; miles?: number; description?: string; dietary?: string; critical?: string; internal?: string;
    menuStatus?: "DRAFT" | "SENT" | "APPROVED"; courses?: [name: string, fire: string | null, items: [dish: string, opts?: { guests?: number; per?: number; notes?: string }][]][];
    payments?: [kind: "DEPOSIT" | "BALANCE" | "TIP" | "OTHER", amount: number, offset: number, method: string][];
    staff?: [name: string | null, role: StaffRole, call: string, end: string, status: "NEEDED" | "INVITED" | "CONFIRMED" | "COMPLETED" | "PAID", resp?: string][];
    equipment?: [name: string, qty: number, status?: "REQUIRED" | "PACKED" | "LOADED" | "ON_SITE" | "RETURNED"][];
    projected?: [category: "BEVERAGE" | "PREP_LABOR" | "TRAVEL" | "RENTALS" | "EQUIPMENT" | "DISPOSABLES" | "OTHER", description: string, amount: number][];
    actual?: [category: "FOOD" | "BEVERAGE" | "LABOR" | "TRAVEL" | "MILEAGE" | "RENTALS" | "DISPOSABLES" | "OTHER", description: string, vendor: string | null, amount: number][];
    guestNotes?: [guest: string | null, restriction: string, severity: "PREFERENCE" | "INTOLERANCE" | "ALLERGY" | "SEVERE_ALLERGY", count?: number][];
    review?: Parameters<typeof db.eventReview.create>[0]["data"] extends infer T ? Omit<T & object, "eventId" | "event"> : never;
    extras?: [name: string, category: IngredientCategory, qty: string, vendor: string, est: number][];
    prep?: boolean; runOfShow?: boolean; completePrepThrough?: PrepPhase[]; shoppingPurchased?: boolean;
  }

  const eventSeeds: EventSeed[] = [
    {
      name: "Ciara’s 40th Birthday Dinner", clientId: harper, venueId: vHarper, platform: "Direct", eventType: "PLATED_DINNER", serviceStyle: "PLATED",
      status: "READY", offset: 2, arrival: "16:30", service: "19:00", end: "22:30", guests: 12, confirmed: true, price: 3150, depositPct: 50,
      finalCountOffset: -5, depositDueOffset: -40, balanceDueOffset: 2, shoppingOffset: 1, prepOffset: 0, miles: 24,
      description: "Five-course plated dinner for Ciara’s 40th. Champagne welcome on the terrace, dinner in the dining room.",
      dietary: "Marcus: severe tree nut allergy — NO pistachio gremolata on any plate; separate board & knife. One pescatarian guest (serve sea bass, not beef).",
      critical: "TREE NUT ALLERGY (Marcus, seat 1). Sparklers with dessert — candles provided by host. Speeches at 8:15 PM; hold dessert until after.",
      menuStatus: "APPROVED",
      courses: [
        ["Welcome Bite", "18:45", [["Potato Blini, Crème Fraîche & Osetra", { per: 2 }]]],
        ["First Course", "19:15", [["Yellowfin Tuna Crudo"]]],
        ["Second Course", "19:45", [["Heirloom Tomato & Burrata"]]],
        ["Entrée", "20:30", [["Miso-Glazed Chilean Sea Bass", { guests: 5 }], ["Beef Tenderloin, Red Wine Demi", { guests: 7 }]]],
        ["Dessert", "21:15", [["Dark Chocolate Pot de Crème", { notes: "Sparkler on Ciara’s" }]]],
      ],
      payments: [["DEPOSIT", 1575, -38, "Zelle"]],
      staff: [["Marisol Vega", "SOUS_CHEF", "16:30", "22:30", "CONFIRMED", "Garde manger + plating line"],
        ["DeShawn Carter", "SERVER", "17:30", "22:30", "CONFIRMED", "Lead server; wine service"],
        ["Hannah Liu", "SERVER", "17:30", "22:30", "INVITED", "Second server; clears & resets"]],
      equipment: [["Induction Burners", 2, "PACKED"], ["Plating Kit (tweezers, ring molds, squeeze bottles)", 1, "PACKED"], ["48 qt Coolers", 3], ["Half Hotel Pans", 8], ["Half Sheet Pans", 6], ["Cambro Insulated Carriers", 1]],
      projected: [["DISPOSABLES", "Parchment, deli containers, gloves", 35], ["OTHER", "Florals for table (client request)", 120]],
      guestNotes: [["Marcus Harper", "Tree nuts", "SEVERE_ALLERGY"], [null, "Pescatarian", "PREFERENCE", 1], ["Ciara Harper", "No cilantro", "PREFERENCE"]],
      extras: [["Champagne (client-supplied — confirm chilled)", "BEVERAGES", "3 bottles", "Other", 0], ["Ice", "OTHER", "2 × 20 lb bags", "Publix", 8]],
      prep: true, runOfShow: true, completePrepThrough: ["SEVERAL_DAYS", "TWO_DAYS"],
    },
    {
      name: "Moreno–Whitfield Wedding", clientId: moreno, venueId: vGrove, platform: "Direct", eventType: "WEDDING", serviceStyle: "BUFFET",
      status: "PLANNING", offset: 24, arrival: "13:00", service: "18:30", end: "23:30", guests: 120, confirmed: false, price: 21600, depositPct: 50,
      finalCountOffset: 10, depositDueOffset: -60, balanceDueOffset: 10, shoppingOffset: 22, prepOffset: 21, miles: 64,
      description: "Garden wedding. Passed hors d’oeuvres during cocktail hour, then a family-style-inspired buffet with a carving station.",
      dietary: "12 vegetarian (risotto station), 2 gluten-free. Kids’ plates for 8.",
      menuStatus: "SENT",
      courses: [
        ["Cocktail Hour", "17:30", [["Mini Crab Cakes", { per: 2 }], ["Yellowfin Tuna Crudo", { per: 0.5, notes: "Served on spoons" }], ["Smashed Avocado Tartine", { per: 1 }]]],
        ["Salad", "18:30", [["Lemon-Parmesan Arugula Salad"]]],
        ["Buffet", "18:45", [["Red Wine Braised Short Rib", { guests: 70 }], ["Lemon-Herb Grilled Chicken", { guests: 50 }], ["Wild Mushroom Risotto", { guests: 12, notes: "Vegetarian — use vegetable stock" }], ["Honey-Roasted Heirloom Carrots"]]],
        ["Dessert", "21:00", [["Dark Chocolate Pot de Crème", { notes: "Alongside wedding cake (by Flour & Bloom)" }]]],
      ],
      payments: [["DEPOSIT", 10800, -58, "Check"]],
      staff: [["Jonah Fields", "CHEF", "12:00", "23:30", "CONFIRMED", "Runs buffet line"], ["Marisol Vega", "SOUS_CHEF", "12:00", "23:30", "CONFIRMED"],
        ["Rafael Ortiz", "KITCHEN_ASSISTANT", "12:00", "23:30", "CONFIRMED"], ["Leo Marchetti", "CAPTAIN", "14:00", "23:59", "CONFIRMED", "Timeline, toasts, vendor coordination"],
        ["DeShawn Carter", "SERVER", "15:00", "23:30", "INVITED"], [null, "SERVER", "15:00", "23:30", "NEEDED"], [null, "SERVER", "15:00", "23:30", "NEEDED"],
        ["Tasha Greene", "BARTENDER", "16:00", "23:30", "CONFIRMED"], ["Brianna Cole", "DISHWASHER", "16:00", "23:59", "INVITED"]],
      equipment: [["Full-Size Chafing Dishes", 16], ["Induction Burners", 4], ["Carving Station & Heat Lamp", 1], ["Full Hotel Pans", 24], ["120 qt Coolers", 3],
        ["Cambro Insulated Carriers", 4], ["Display Risers", 10], ["Serving Utensils", 30], ["Black Linen Tablecloths 120\"", 8]],
      projected: [["RENTALS", "Plates, flatware, glassware — Party Rental Co.", 1450], ["EQUIPMENT", "Generator (venue)", 250], ["TRAVEL", "Box truck rental", 185],
        ["PREP_LABOR", "Two prep days × 2 people", 640], ["DISPOSABLES", "Foil, sternos, gloves", 160]],
      guestNotes: [[null, "Vegetarian", "PREFERENCE", 12], [null, "Gluten-free", "INTOLERANCE", 2], [null, "Kids’ plates", "PREFERENCE", 8]],
    },
    {
      name: "Brightline Q4 Leadership Lunch", clientId: brightline, venueId: vBrightline, platform: "Direct", eventType: "CORPORATE", serviceStyle: "DROP_OFF",
      status: "BOOKED", offset: 6, arrival: "11:00", service: "12:00", end: "12:30", guests: 45, confirmed: true, price: 2475, depositPct: 0,
      balanceDueOffset: 21, shoppingOffset: 5, prepOffset: 5, miles: 18, description: "Drop-off buffet lunch for the leadership offsite. Set up and leave; pickup at 3 PM.",
      dietary: "4 vegetarian, 1 vegan (Arjun) — label everything.", menuStatus: "APPROVED",
      courses: [["Lunch", "12:00", [["Lemon-Parmesan Arugula Salad"], ["Lemon-Herb Grilled Chicken", { guests: 30 }], ["Herb-Crusted Salmon", { guests: 15 }], ["Honey-Roasted Heirloom Carrots"], ["Dark Chocolate Pot de Crème"]]]],
      staff: [["Rafael Ortiz", "KITCHEN_ASSISTANT", "09:00", "13:00", "CONFIRMED", "Load, set up buffet, labels"]],
      equipment: [["Full-Size Chafing Dishes", 5], ["Full Hotel Pans", 8], ["Compostable Dinnerware Sets", 50], ["Serving Utensils", 10], ["Display Risers", 4]],
      projected: [["DISPOSABLES", "Sternos, labels, napkins", 45]],
      guestNotes: [[null, "Vegetarian", "PREFERENCE", 4], ["Arjun", "Vegan", "PREFERENCE", 1]],
      prep: true,
    },
    {
      name: "Castellano Family — Keys Vacation Week", clientId: castellano, venueId: vMarea, platform: "Airbnb Experiences", eventType: "VACATION_CHEF", serviceStyle: "FAMILY_STYLE",
      status: "BOOKED", offset: 13, endOffset: 17, arrival: "16:00", service: "18:30", end: "21:00", guests: 8, confirmed: true, price: 4800, depositPct: 50,
      depositDueOffset: -2, balanceDueOffset: 13, shoppingOffset: 12, prepOffset: 12, miles: 172,
      description: "Five dinners (Mon–Fri) for a family of 8 staying in Islamorada. Family-style, relaxed, kid-friendly options.",
      dietary: "Rob: shellfish allergy. Kids (6 & 9) want simple plates.", menuStatus: "DRAFT",
      courses: [["Night 1 — Welcome Dinner", "18:30", [["Lemon-Parmesan Arugula Salad"], ["Herb-Crusted Salmon"], ["Honey-Roasted Heirloom Carrots"]]]],
      payments: [],
      staff: [],
      equipment: [["120 qt Coolers", 2], ["Induction Burners", 1], ["Half Sheet Pans", 4], ["Plating Kit (tweezers, ring molds, squeeze bottles)", 1]],
      projected: [["TRAVEL", "Tolls + lodging 4 nights (Islamorada)", 780]],
      guestNotes: [["Rob Castellano", "Shellfish", "ALLERGY"], [null, "Kids — simple plates", "PREFERENCE", 2]],
    },
    {
      name: "Sunday Garden Brunch", clientId: delgado, venueId: vDelgado, platform: "Direct", eventType: "BRUNCH", serviceStyle: "FAMILY_STYLE",
      status: "PLANNING", offset: 4, arrival: "09:00", service: "11:00", end: "13:30", guests: 20, confirmed: false, price: 1900, depositPct: 50,
      finalCountOffset: -1, depositDueOffset: -20, balanceDueOffset: 4, shoppingOffset: 3, prepOffset: 3, miles: 12,
      description: "Family brunch in the garden for Daniel’s parents’ visit.", dietary: "Lucia (8): peanut allergy.", menuStatus: "APPROVED",
      courses: [["Brunch", "11:00", [["Smashed Avocado Tartine"], ["Soft Scrambled Eggs"], ["Brioche French Toast"], ["Maple-Glazed Thick-Cut Bacon"], ["Lemon-Parmesan Arugula Salad"]]]],
      payments: [["DEPOSIT", 950, -19, "Venmo"]],
      staff: [["Rafael Ortiz", "KITCHEN_ASSISTANT", "08:30", "14:00", "CONFIRMED"], [null, "SERVER", "09:30", "14:00", "NEEDED"]],
      equipment: [["Full-Size Chafing Dishes", 4], ["White Porcelain Platters", 6], ["Induction Burners", 2], ["48 qt Coolers", 2]],
      guestNotes: [["Lucia Delgado", "Peanuts", "ALLERGY"]],
      prep: true,
    },
    {
      name: "Sushi & Knife Skills Class", clientId: nakamura, venueId: vNakamura, platform: "Direct", eventType: "COOKING_CLASS", serviceStyle: "INTERACTIVE",
      status: "BOOKED", offset: 9, arrival: "17:30", service: "19:00", end: "21:30", guests: 10, confirmed: true, price: 1450, depositPct: 50,
      depositDueOffset: -10, balanceDueOffset: 9, shoppingOffset: 8, prepOffset: 8, miles: 14,
      description: "Hands-on birthday class: knife skills, sushi rice, rolling maki. Kai’s friends — casual and fun.",
      menuStatus: "APPROVED", courses: [["Class", "19:00", [["Yellowfin Tuna Crudo", { per: 0.5, notes: "Chef demo" }], ["Hand-Rolled Spicy Tuna Maki"]]]],
      payments: [["DEPOSIT", 725, -12, "Zelle"]],
      staff: [["Rafael Ortiz", "KITCHEN_ASSISTANT", "17:30", "21:30", "INVITED", "Class assistant & dishes"]],
      equipment: [["Plating Kit (tweezers, ring molds, squeeze bottles)", 1], ["48 qt Coolers", 2], ["Half Sheet Pans", 6]],
      projected: [["EQUIPMENT", "10 bamboo mats + 10 cutting boards (reusable)", 90]],
    },
    {
      name: "Rosewood Book Club Supper", clientId: rosewood, venueId: vPorter, platform: "Direct", eventType: "FAMILY_STYLE", serviceStyle: "FAMILY_STYLE",
      status: "BOOKED", offset: 19, arrival: "17:00", service: "19:00", end: "21:30", guests: 14, confirmed: false, price: 1960, depositPct: 50,
      finalCountOffset: 12, depositDueOffset: 2, balanceDueOffset: 19, shoppingOffset: 18, prepOffset: 17, miles: 38,
      description: "Italian family-style supper themed to this month’s book (set in Tuscany).", menuStatus: "DRAFT",
      courses: [["Antipasti", "19:00", [["Heirloom Tomato & Burrata"]]], ["Mains", "19:45", [["Wild Mushroom Risotto"], ["Beef Tenderloin, Red Wine Demi"]]], ["Dolci", "20:45", [["Dark Chocolate Pot de Crème"]]]],
      staff: [["Hannah Liu", "SERVER", "18:00", "21:30", "INVITED"]],
    },
    {
      name: "Seaview Realty Holiday Party", clientId: seaview, venueId: vSeaview, platform: "Direct", eventType: "COCKTAIL", serviceStyle: "PASSED",
      status: "TENTATIVE", offset: 58, arrival: "16:00", service: "18:00", end: "21:00", guests: 60, confirmed: false, price: 5400, depositPct: 50,
      depositDueOffset: 3, balanceDueOffset: 51, miles: 36, description: "Heavy hors d’oeuvres holiday cocktail party. Holding date pending deposit.",
    },
    {
      name: "Harvest Dinner at the Chens’", clientId: chen, venueId: vChen, platform: "Yhangry", eventType: "PRIVATE_DINNER", serviceStyle: "PLATED",
      status: "BOOKED", offset: 33, arrival: "16:30", service: "19:00", end: "22:00", guests: 10, confirmed: false, price: 1650, depositPct: 50,
      finalCountOffset: 26, depositDueOffset: -3, balanceDueOffset: 26, miles: 8, description: "Seasonal four-course dinner. Vegetable-forward.",
      payments: [["DEPOSIT", 825, -4, "Platform"]],
    },
    // Past events
    {
      name: "Okafor 10th Anniversary Dinner", clientId: okafor, venueId: vOkafor, platform: "Direct", eventType: "PRIVATE_DINNER", serviceStyle: "PLATED",
      status: "COMPLETED", offset: -5, arrival: "16:30", service: "19:30", end: "22:00", guests: 6, confirmed: true, price: 1680, depositPct: 50,
      depositDueOffset: -35, balanceDueOffset: -5, miles: 52, menuStatus: "APPROVED",
      courses: [["First", "19:30", [["Seared Diver Scallops"]]], ["Main", "20:15", [["Beef Tenderloin, Red Wine Demi"]]], ["Dessert", "21:00", [["Dark Chocolate Pot de Crème"]]]],
      payments: [["DEPOSIT", 840, -34, "Zelle"], ["BALANCE", 840, -5, "Zelle"], ["TIP", 250, -5, "Cash"]],
      staff: [["DeShawn Carter", "SERVER", "18:00", "22:00", "PAID", "Server"]],
      actual: [["FOOD", "Restaurant Depot", "Restaurant Depot", 162], ["FOOD", "Casablanca Seafood — scallops", "Casablanca Seafood", 58], ["FOOD", "Publix", "Publix", 41],
        ["TRAVEL", "Gas + tolls", null, 22]],
      review: { rating: 5, wentWell: "Scallop sear was perfect; timing between courses was relaxed.", wentWrong: "Oven ran cool — tenderloin took 10 extra minutes.",
        clientLoved: "The pot de crème. Nia asked for the recipe.", changeNextTime: "Bring the probe thermometer with the backup battery.", ranOut: "Nothing.",
        excessLeftovers: "Potato purée — cut batch by a third for 6 guests.", serveMenuAgain: true, takeClientAgain: true, operationalNotes: "Induction cooktop — bring flat-bottom pans only." },
      shoppingPurchased: true,
    },
    {
      name: "Lumen Health Team Offsite Dinner", clientId: lumen, venueId: vKampong, platform: "Direct", eventType: "CORPORATE", serviceStyle: "BUFFET",
      status: "COMPLETED", offset: -12, arrival: "15:00", service: "18:30", end: "21:30", guests: 32, confirmed: true, price: 4160, depositPct: 50,
      depositDueOffset: -40, balanceDueOffset: -12, miles: 22, menuStatus: "APPROVED",
      courses: [["Starters", "18:00", [["Mini Crab Cakes", { per: 2 }]]], ["Buffet", "18:30", [["Lemon-Parmesan Arugula Salad"], ["Red Wine Braised Short Rib"], ["Herb-Crusted Salmon", { guests: 12 }], ["Honey-Roasted Heirloom Carrots"]]], ["Dessert", "20:00", [["Dark Chocolate Pot de Crème"]]]],
      payments: [["DEPOSIT", 2080, -40, "ACH"], ["BALANCE", 2080, -8, "ACH"]],
      staff: [["Marisol Vega", "SOUS_CHEF", "14:00", "21:30", "PAID"], ["DeShawn Carter", "SERVER", "16:30", "21:30", "PAID"], ["Hannah Liu", "SERVER", "16:30", "21:30", "PAID"], ["Brianna Cole", "DISHWASHER", "17:00", "21:30", "PAID"]],
      actual: [["FOOD", "Restaurant Depot", "Restaurant Depot", 612], ["FOOD", "Costco", "Costco", 284], ["FOOD", "Publix", "Publix", 96],
        ["RENTALS", "Plates & flatware", "Party Rental Co.", 312], ["DISPOSABLES", "Sternos, foil, gloves", null, 58], ["TRAVEL", "Gas", null, 31]],
      review: { rating: 4, wentWell: "Short ribs held beautifully for two hours.", wentWrong: "Salmon crust softened in the covered chafer.",
        clientLoved: "Short rib and the crab cakes — Marcus wants the same for their spring offsite.", changeNextTime: "Vent salmon chafers; bring a second carving board.",
        ranOut: "Crab cakes — 2 per guest wasn’t enough for this group.", excessLeftovers: "About 30% of salad.", serveMenuAgain: true, takeClientAgain: true },
      shoppingPurchased: true,
    },
    {
      name: "Marlowe Burgundy Pairing Dinner", clientId: marlowe, venueId: vMarlowe, platform: "Direct", eventType: "PRIVATE_DINNER", serviceStyle: "PLATED",
      status: "BOOKED", offset: -2, arrival: "16:00", service: "19:30", end: "23:00", guests: 8, confirmed: true, price: 2400, depositPct: 50,
      depositDueOffset: -30, balanceDueOffset: -2, miles: 30, menuStatus: "APPROVED",
      courses: [["First", "19:30", [["Yellowfin Tuna Crudo"]]], ["Second", "20:15", [["Wild Mushroom Risotto"]]], ["Main", "21:00", [["Beef Tenderloin, Red Wine Demi"]]], ["Dessert", "21:45", [["Dark Chocolate Pot de Crème"]]]],
      payments: [["DEPOSIT", 1200, -29, "Zelle"]],
      staff: [["Hannah Liu", "SERVER", "18:00", "23:00", "COMPLETED"]],
    },
    {
      name: "Delgado Easter-Style Family Lunch", clientId: delgado, venueId: vDelgado, platform: "Direct", eventType: "FAMILY_STYLE", serviceStyle: "FAMILY_STYLE",
      status: "COMPLETED", offset: -26, service: "13:00", guests: 16, confirmed: true, price: 1520, depositPct: 50, miles: 12, menuStatus: "APPROVED",
      courses: [["Lunch", "13:00", [["Lemon-Parmesan Arugula Salad"], ["Lemon-Herb Grilled Chicken"], ["Honey-Roasted Heirloom Carrots"], ["Dark Chocolate Pot de Crème"]]]],
      payments: [["DEPOSIT", 760, -50, "Venmo"], ["BALANCE", 760, -26, "Venmo"]],
      actual: [["FOOD", "Publix + Costco", "Costco", 238], ["LABOR", "Rafael (paid cash)", null, 120]],
      review: { rating: 5, clientLoved: "Chicken — kids ate seconds.", serveMenuAgain: true, takeClientAgain: true },
    },
    {
      name: "Harper Spring Supper", clientId: harper, venueId: vHarper, platform: "Direct", eventType: "PRIVATE_DINNER", serviceStyle: "PLATED",
      status: "COMPLETED", offset: -71, service: "19:00", guests: 8, confirmed: true, price: 1840, depositPct: 50, miles: 24, menuStatus: "APPROVED",
      courses: [["First", "19:00", [["Heirloom Tomato & Burrata"]]], ["Main", "19:45", [["Miso-Glazed Chilean Sea Bass"]]], ["Dessert", "20:45", [["Dark Chocolate Pot de Crème"]]]],
      payments: [["DEPOSIT", 920, -100, "Zelle"], ["BALANCE", 920, -71, "Zelle"], ["TIP", 300, -71, "Zelle"]],
      actual: [["FOOD", "Casablanca + Whole Foods", "Casablanca Seafood", 311]],
      review: { rating: 5, clientLoved: "Sea bass — ‘best thing I’ve eaten all year’.", serveMenuAgain: true, takeClientAgain: true },
    },
  ];

  const eventIds: Record<string, string> = {};
  for (const e of eventSeeds) {
    const deposit = Math.round((e.price * (e.depositPct ?? 50)) / 100);
    const created = await db.event.create({
      data: {
        name: e.name, clientId: e.clientId, venueId: e.venueId, platformId: e.platform ? platforms[e.platform] : undefined,
        eventType: e.eventType, serviceStyle: e.serviceStyle, status: e.status, date: day(e.offset),
        endDate: e.endOffset !== undefined ? day(e.endOffset) : undefined, arrivalTime: e.arrival, serviceTime: e.service, endTime: e.end,
        guestCount: e.guests, guestCountConfirmed: e.confirmed ?? false,
        finalCountDueDate: e.finalCountOffset !== undefined ? day(e.finalCountOffset) : undefined,
        priceCents: $(e.price), depositCents: $(deposit),
        depositDueDate: e.depositDueOffset !== undefined ? day(e.depositDueOffset) : undefined,
        balanceDueDate: e.balanceDueOffset !== undefined ? day(e.balanceDueOffset) : undefined,
        shoppingDate: e.shoppingOffset !== undefined ? day(e.shoppingOffset) : undefined,
        prepStartDate: e.prepOffset !== undefined ? day(e.prepOffset) : undefined,
        roundTripMiles: e.miles, description: e.description, dietarySummary: e.dietary, criticalNotes: e.critical, internalNotes: e.internal,
        guestNotes: e.guestNotes ? { create: e.guestNotes.map(([guestName, restriction, severity, count]) => ({ guestName, restriction, severity, count: count ?? 1 })) } : undefined,
        payments: e.payments ? { create: e.payments.map(([kind, amount, offset, method]) => ({ kind, amountCents: $(amount), receivedOn: day(offset), method })) } : undefined,
        staffAssignments: e.staff ? {
          create: e.staff.map(([name, role, callTime, endTime, status, responsibilities], i) => {
            const member = name ? staffData.find((s) => s[0] === name)! : null;
            const fallbackRate: Partial<Record<StaffRole, number>> = { SERVER: 28, KITCHEN_ASSISTANT: 22, BARTENDER: 32, DISHWASHER: 20 };
            return {
              staffMemberId: name ? staff[name] : null, role, callTime, endTime, status, responsibilities, sortOrder: i,
              rateCents: $(member ? member[2] : (fallbackRate[role] ?? 25)), rateType: member ? member[3] : "HOURLY",
              paidOn: status === "PAID" ? day(e.offset + 1) : null,
            };
          }),
        } : undefined,
        equipment: e.equipment ? { create: e.equipment.map(([name, quantity, status]) => ({ equipmentItemId: equip[name], quantity, status: status ?? "REQUIRED" })) } : undefined,
        expenses: {
          create: [
            // Shopping & prep help unless the event already lists it: ~3 hours + 9 minutes per guest at $22/hr.
            ...(e.projected?.some((p) => p[0] === "PREP_LABOR") || e.status === "TENTATIVE" ? [] : [{
              kind: "PROJECTED" as const, category: "PREP_LABOR" as const, description: "Shopping & prep assistant",
              amountCents: $(Math.ceil(3 + e.guests * 0.15) * 22),
            }]),
            ...(e.projected ?? []).map(([category, description, amount]) => ({ kind: "PROJECTED" as const, category, description, amountCents: $(amount) })),
            ...(e.actual ?? []).map(([category, description, vendor, amount]) => ({ kind: "ACTUAL" as const, category, description, vendor, amountCents: $(amount), date: day(e.offset - 1) })),
          ],
        },
        review: e.review ? { create: e.review } : undefined,
        shoppingExtras: e.extras ? { create: e.extras.map(([name, category, quantity, vendor, est]) => ({ name, category, quantity, vendorId: vendors[vendor], estimatedCents: $(est) })) } : undefined,
        menu: e.courses ? {
          create: {
            status: e.menuStatus ?? "DRAFT",
            sentAt: e.menuStatus && e.menuStatus !== "DRAFT" ? day(Math.min(e.offset - 14, -1)) : null,
            approvedAt: e.menuStatus === "APPROVED" ? day(Math.min(e.offset - 10, -1)) : null,
            courses: {
              create: e.courses.map(([name, fireTime, items], ci) => ({
                name, fireTime, sortOrder: ci,
                items: { create: items.map(([d, opts], ii) => ({ dishId: dish[d], sortOrder: ii, guestCount: opts?.guests, portionsPerGuest: opts?.per ?? 1, notes: opts?.notes })) },
              })),
            },
          },
        } : undefined,
      },
    });
    eventIds[e.name] = created.id;

    // Prep plan & day-of timeline, drafted by the same engine the app uses.
    if (e.prep || e.runOfShow || e.shoppingPurchased) {
      const full = await db.event.findUniqueOrThrow({ where: { id: created.id }, include: { menu: { include: menuInclude } } });
      const menuInput = toMenuInput(full.menu);
      if (e.prep && full.menu) {
        const reqs = menuRequirements(menuInput, full.guestCount).map((r) => {
          const row = full.menu!.courses.flatMap((c) => c.items).flatMap((i) => i.dish.components).find((c) => c.recipe.id === r.recipe.id)!.recipe;
          return { ...r, recipe: toRecipeInput(row) };
        });
        const dishes = full.menu.courses.flatMap((c) => c.items.map((i) => ({ id: i.dish.id, name: i.dish.name })));
        const drafts = draftPrepTasks(reqs, dishes, []);
        const done = new Set(e.completePrepThrough ?? []);
        const staffIds = Object.values(staff);
        await db.prepTask.createMany({
          data: drafts.map((d, i) => ({
            eventId: created.id, title: d.title, phase: d.phase, recipeId: d.recipeId, dishId: d.dishId, estimatedMinutes: d.estimatedMinutes,
            generated: true, sortOrder: i, status: done.has(d.phase) ? "COMPLETE" : d.phase === "DAY_BEFORE" && i % 3 === 0 ? "IN_PROGRESS" : "NOT_STARTED",
            assigneeId: d.phase === "ON_SITE" ? staff["Marisol Vega"] : i % 4 === 0 ? staffIds[4] : null,
          })),
        });
        // Hand-written tasks that no recipe would generate.
        await db.prepTask.createMany({
          data: [
            { eventId: created.id, title: "Confirm final headcount & allergies with host", phase: "SEVERAL_DAYS", status: "COMPLETE", sortOrder: 100 },
            { eventId: created.id, title: "Load vehicle against packing list", phase: "BEFORE_DEPARTURE", estimatedMinutes: 30, sortOrder: 101 },
            { eventId: created.id, title: "Label all containers (dish, allergen, reheat temp)", phase: "BEFORE_DEPARTURE", estimatedMinutes: 20, sortOrder: 102 },
          ],
        });
      }
      if (e.runOfShow && full.menu) {
        const draft = draftRunOfShow({
          arrivalTime: full.arrivalTime, serviceTime: full.serviceTime, endTime: full.endTime,
          courses: full.menu.courses.map((c) => ({ name: c.name, fireTime: c.fireTime, dishes: c.items.map((i) => i.dish.name) })),
        });
        await db.runOfShowItem.createMany({
          data: draft.map((d, i) => ({ eventId: created.id, time: d.time, title: d.title, kind: d.kind, details: d.details, sortOrder: i, doneLines: [] })),
        });
      }
      if (e.shoppingPurchased && full.menu) {
        // Mark everything purchased at roughly estimated prices.
        const lines = full.menu.courses.flatMap((c) => c.items).flatMap((i) => i.dish.components).flatMap((c) => c.recipe.ingredients.map((l) => l.ingredientId));
        const unique = [...new Set(lines)];
        await db.shoppingItemState.createMany({ data: unique.map((ingredientId) => ({ eventId: created.id, ingredientId, status: "PURCHASED" as const })) });
      }
    }
  }

  // Calendar entries not tied to an event.
  await db.calendarEntry.createMany({
    data: [
      { title: "Menu tasting — Moreno–Whitfield", type: "TASTING", date: day(3), startTime: "15:00", eventId: eventIds["Moreno–Whitfield Wedding"], notes: "Tasting for couple + planner at the studio kitchen." },
      { title: "Knife sharpening pickup", type: "OTHER", date: day(1), startTime: "10:00" },
      { title: "Restaurant Depot run (pantry restock)", type: "SHOPPING", date: day(7), startTime: "08:00" },
      { title: "Food handler certification renewal due", type: "DEADLINE", date: day(15) },
    ],
  });

  // ─── Leads ───────────────────────────────────────────────────────────────
  type LeadSeed = Omit<Prisma.LeadUncheckedCreateInput, "eventDate" | "nextFollowUpDate"> & { eventOffset?: number; followOffset?: number; createdOffset: number };
  const leads: LeadSeed[] = [
    { name: "Maya Richardson", phone: "(305) 555-0301", email: "maya.r@example.com", eventOffset: 40, location: "Key Biscayne", guestCount: 16, eventType: "PRIVATE_DINNER",
      requestedService: "Plated dinner, 4 courses", budgetCents: $(2500), cuisineRequest: "Mediterranean, lots of seafood", source: "INSTAGRAM", status: "NEW",
      estimatedValueCents: $(2800), notes: "DM’d after the sea bass reel. Husband’s 50th.", createdOffset: 0 },
    { name: "Jordan Ellis", phone: "(954) 555-0302", email: "jordan.ellis@example.com", eventOffset: 75, location: "Fort Lauderdale", guestCount: 30, eventType: "FAMILY_STYLE",
      requestedService: "Rehearsal dinner", budgetCents: $(4500), source: "WEBSITE", status: "NEW", estimatedValueCents: $(4800),
      dietaryRestrictions: "Bride is celiac", notes: "Inquiry form. Wants a call this week.", createdOffset: -2 },
    { name: "Luis Romero", phone: "(786) 555-0303", eventOffset: 21, location: "Wynwood", guestCount: 25, eventType: "COCKTAIL", requestedService: "Gallery opening bites",
      source: "TIKTOK", status: "NEW", estimatedValueCents: $(2200), createdOffset: 0 },
    { name: "Bianca Torres", phone: "(305) 555-0304", email: "bianca.t@example.com", eventOffset: 16, location: "Coconut Grove", guestCount: 8, eventType: "PRIVATE_DINNER",
      requestedService: "Date-night chef’s table", budgetCents: $(1400), source: "GOOGLE", status: "CONTACTED", followOffset: 1, estimatedValueCents: $(1450),
      notes: "Spoke Tuesday. Sending menu options.", createdOffset: -5, lastContactedAt: day(-3) },
    { name: "Theo Park", phone: "(786) 555-0305", email: "theo.park@example.com", eventOffset: 28, location: "Brickell", guestCount: 40, eventType: "COCKTAIL",
      requestedService: "Passed apps + bar", budgetCents: $(3500), source: "GIGSALAD", platformId: platforms["GigSalad"], status: "QUOTE_SENT", followOffset: -1,
      estimatedValueCents: $(3900), notes: "Quote sent via GigSalad. Comparing two caterers.", createdOffset: -9, lastContactedAt: day(-4) },
    { name: "Rachel Kim", phone: "(305) 555-0306", email: "rkim@harborviewdental.example.com", eventOffset: 35, location: "Aventura", guestCount: 25, eventType: "CORPORATE",
      requestedService: "Staff appreciation lunch", budgetCents: $(1500), source: "REFERRAL", status: "FOLLOW_UP", followOffset: -4, estimatedValueCents: $(1650),
      notes: "Harborview Dental. Referred by Priya at Brightline. Waiting on their date confirmation.", createdOffset: -14, lastContactedAt: day(-10) },
    { name: "Aaron & Leah Goldstein", phone: "(954) 555-0307", email: "leah.goldstein@example.com", eventOffset: 49, location: "Boca Raton", guestCount: 20,
      eventType: "PLATED_DINNER", requestedService: "25th anniversary — 5 courses with wine pairing", budgetCents: $(4500), source: "PLANNER", status: "NEGOTIATING",
      followOffset: 2, estimatedValueCents: $(4800), notes: "Want to include a raw bar; negotiating scope vs. budget.", createdOffset: -12, lastContactedAt: day(-1) },
    { name: "Sam Whitaker", phone: "(305) 555-0308", source: "THUMBTACK", platformId: platforms["Thumbtack"], status: "QUOTE_SENT", requestedService: "Weekly meal prep (family of 4)",
      guestCount: 4, followOffset: 3, estimatedValueCents: $(900), notes: "Recurring weekly potential.", createdOffset: -6, lastContactedAt: day(-2) },
    { name: "Priya Nair", email: "priya.nair@example.com", source: "YHANGRY", platformId: platforms["Yhangry"], status: "CONTACTED", eventOffset: 30, guestCount: 10,
      eventType: "PRIVATE_DINNER", location: "Doral", followOffset: 5, estimatedValueCents: $(1500), createdOffset: -3, lastContactedAt: day(-2) },
    { name: "Megan Doyle", phone: "(305) 555-0310", source: "GOOGLE", status: "LOST", lostReason: "PRICE", lostNotes: "Went with a $65/pp buffet caterer.",
      guestCount: 35, eventType: "BUFFET", estimatedValueCents: $(3200), createdOffset: -30 },
    { name: "Coastal Yacht Club", email: "events@coastalyc.example.com", source: "REFERRAL", status: "LOST", lostReason: "DATE_UNAVAILABLE",
      lostNotes: "Wanted the wedding date.", guestCount: 80, eventType: "COCKTAIL", estimatedValueCents: $(7200), createdOffset: -20 },
    { name: "Ryan Brooks", phone: "(786) 555-0312", source: "THE_BASH", status: "LOST", lostReason: "NO_RESPONSE", guestCount: 12, eventType: "PRIVATE_DINNER",
      estimatedValueCents: $(1600), createdOffset: -25 },
    { name: "Rob Castellano", phone: "(312) 555-0114", source: "AIRBNB", platformId: platforms["Airbnb Experiences"], status: "BOOKED", guestCount: 8,
      eventType: "VACATION_CHEF", estimatedValueCents: $(4800), clientId: castellano, eventId: eventIds["Castellano Family — Keys Vacation Week"], createdOffset: -21, lastContactedAt: day(-15) },
    { name: "Kai Nakamura", phone: "(786) 555-0171", source: "INSTAGRAM", status: "BOOKED", guestCount: 10, eventType: "COOKING_CLASS",
      estimatedValueCents: $(1450), clientId: nakamura, eventId: eventIds["Sushi & Knife Skills Class"], createdOffset: -18, lastContactedAt: day(-12) },
  ];
  for (const [i, { eventOffset, followOffset, createdOffset, ...l }] of leads.entries()) {
    await db.lead.create({
      data: {
        ...l, boardOrder: i,
        eventDate: eventOffset !== undefined ? day(eventOffset) : undefined,
        nextFollowUpDate: followOffset !== undefined ? day(followOffset) : undefined,
        createdAt: new Date(day(createdOffset).getTime() + 15 * 3_600_000),
      },
    });
  }

  const counts = {
    ingredients: await db.ingredient.count(), recipes: await db.recipe.count(), dishes: await db.dish.count(),
    clients: await db.client.count(), events: await db.event.count(), leads: await db.lead.count(), staff: await db.staffMember.count(),
  };
  console.log("Done.", counts);
  console.log(`Sign in with ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
