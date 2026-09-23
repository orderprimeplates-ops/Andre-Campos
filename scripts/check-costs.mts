import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { menuInclude, toMenuInput } from "../src/lib/mappers";
import { eventFoodCost, buildShoppingList } from "../src/lib/domain/culinary";
import { projectEvent, projectedLabor } from "../src/lib/domain/finance";
import { formatMoney } from "../src/lib/domain/money";
import { formatQuantity } from "../src/lib/domain/units";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const events = await db.event.findMany({ include: { menu: { include: menuInclude }, staffAssignments: true, expenses: true, platform: true }, orderBy: { date: "asc" } });
for (const e of events) {
  const m = toMenuInput(e.menu);
  const food = eventFoodCost(m, e.guestCount);
  const p = projectEvent({ priceCents: e.priceCents, guestCount: e.guestCount, foodCostCents: food.cents, laborCents: projectedLabor(e.staffAssignments),
    roundTripMiles: e.roundTripMiles, expenses: e.expenses.filter(x => x.kind === "PROJECTED") as any, platform: e.platform, settings: { targetMarginPct: 45, minimumMarginPct: 35, mileageRateCents: 70 } });
  console.log(e.name.padEnd(40), String(e.guestCount).padStart(4), "price", formatMoney(e.priceCents).padStart(8), "food", formatMoney(food.cents).padStart(8),
    "food%", (p.foodCostPct ?? 0).toFixed(0).padStart(3), "margin", (p.marginPct ?? 0).toFixed(0).padStart(3), "rec", formatMoney(p.recommendedPriceCents), food.unpriced.length ? "UNPRICED " + JSON.stringify(food.unpriced) : "");
}
const harper = events.find(e => e.name.startsWith("Ciara"))!;
for (const l of buildShoppingList(toMenuInput(harper.menu), harper.guestCount).slice(0, 40))
  console.log(l.ingredient.name.padEnd(32), formatQuantity(l.neededQty, l.unit).padEnd(12), "buy", l.packages, "×", l.ingredient.purchaseUnit, formatMoney(l.purchaseCostCents), l.unconverted.length ? "UNCONVERTED" : "");
await db.$disconnect();
