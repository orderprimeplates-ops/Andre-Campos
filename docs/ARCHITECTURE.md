# Prime Plates HQ — Architecture & Build Plan

Prime Plates HQ is the internal operating system for Prime Plates, a private chef and
catering company. This document explains how the application is built and why, in plain
English first, with technical detail underneath.

---

## 1. The big picture (plain English)

Think of the app in three layers, like a restaurant:

| Layer | Restaurant analogy | What it is in the app |
|---|---|---|
| **The pantry** | Where every ingredient lives, labeled and organized | A PostgreSQL database. Every client, event, recipe and price is stored exactly once. |
| **The kitchen** | Where the cooking (the thinking) happens | The "domain engine": scaling recipes, costing dishes, building shopping lists, calculating margins, deciding what needs attention. |
| **The dining room** | What you see | The screens: Dashboard, Calendar, Event Workspace, Shopping mode and the rest. |

The most important rule: **the kitchen calculates, it doesn't copy.** A shopping list is not
typed in; it's *cooked* from the menu, the recipes and the guest count every time you open it.
That's why changing a guest count from 12 to 16 instantly updates recipe quantities, the
shopping list and the projected food cost. Nothing gets out of sync because there's only one
source of truth.

What *is* saved are the things only you can know: "I bought this," "Publix was out of
shallots," "the actual price was $14.80," "this prep task is done."

---

## 2. Technology stack

| Choice | What it is | Why |
|---|---|---|
| **Next.js 16 (React)** | The web framework: screens + server in one project | One codebase for desktop, iPhone and tablet. Mature, fast, and it runs server code securely, so database credentials never reach the browser. |
| **TypeScript** | JavaScript with spell-check for data | Catches mistakes like "guest count is text, not a number" before they reach you. |
| **PostgreSQL** | The database | Industry-standard and reliable, good for relationships (clients → events → menus → dishes → recipes → ingredients). Also supports AI search later (pgvector). |
| **Prisma** | The translator between code and database | Defines the database in one readable file (`prisma/schema.prisma`) and manages safe, versioned changes to it ("migrations"). |
| **Tailwind CSS** | The styling system | Lets us build a custom, premium visual identity instead of a generic admin template. |
| **Server Actions** | How forms save data | Every save runs on the server, gets validated, then refreshes the screen. |
| **Vitest** | Automated tests | The money math (costing, margins, platform fees, scaling) is tested automatically. You should never have to double-check the app's arithmetic. |

### Hosting (recommendation, not yet done)

- **Vercel** for the app plus **Neon** or **Supabase** for the PostgreSQL database.
- Expected cost at your size: about $20/month (Vercel Pro — the free plan is for non-commercial use; Neon's free database tier is enough to start). See `docs/DEPLOYING.md`.
- You get automatic HTTPS and daily database backups, and you only need your iPhone and a browser to use it.

### What I deliberately did *not* choose

- **No separate mobile app.** A well-designed responsive web app, added to your iPhone home
  screen, gives you 95% of the benefit with none of the App Store overhead. We can revisit this later.
- **No microservices or complex infrastructure.** One app and one database, which is easy to maintain.
- **No full accounting.** Financials are *operational intelligence*. QuickBooks/Xero integration can come later.

---

## 3. Security

- **Login required** for every page. Passwords are hashed with bcrypt, never stored as-is.
- **Sessions** are random tokens stored hashed in the database and sent to the browser as a secure,
  HTTP-only cookie (JavaScript in the browser can't read it). Sessions expire after 30 days and can be revoked.
- **Database credentials live only on the server** (environment variables), never in the browser code.
- **Every data read/write runs on the server** behind the session check, so the browser only receives what's displayed.
- **Users have roles** (`OWNER`, `MANAGER`, `STAFF`). V1 is just you, but roles are in place now
  so a Staff Portal or a sous chef login can be added later without restructuring.
- Every form is validated on the server before it's saved (required fields, numbers, dates,
  allowed values), and every server action re-checks the login — not just the pages.

---

## 4. Data model (how information connects)

```
Lead ──(convert)──► Client ──< Event >── Platform (Direct, Airbnb, GigSalad…)
                       │          │
                       │          ├── Venue (reusable; kitchen checklist lives here)
                       │          ├── Menu ──< MenuCourse ──< MenuItem >── Dish
                       │          │                                        │
                       │          │                    Dish ──< DishComponent >── Recipe
                       │          │                                                │
                       │          │                  Recipe ──< RecipeIngredient >── Ingredient
                       │          │                                          (price, vendor, category)
                       │          ├──< StaffAssignment >── StaffMember
                       │          ├──< EventEquipment >── EquipmentItem
                       │          ├──< ShoppingItemState   (purchased / not found / actual price)
                       │          ├──< ShoppingExtraItem   (manual adds: ice, disposables…)
                       │          ├──< PrepTask
                       │          ├──< RunOfShowItem       (Day-of timeline)
                       │          ├──< Payment
                       │          ├──< EventExpense        (projected & actual costs)
                       │          ├──  EventReview         (post-event notes)
                       │          └──< Attachment          (photos — storage wired later)
                       └──< Venue                (the client's own addresses, with kitchen checklist)
CalendarEntry  (custom entries & future external-calendar sync)
BusinessSettings (target margin, minimum margin, mileage rate…)
User / Session (login)
```

### Key design decisions in the data model

1. **Dish ≠ Recipe.** A *Dish* is what the guest experiences ("Miso-Glazed Chilean Sea Bass").
   A *Recipe* is a component you cook ("Ginger-Soy Beurre Blanc"). A dish lists its components
   and how many recipe portions go on each plate.
2. **Venues are their own records.** If you cook at the same Airbnb or client home twice, the kitchen
   checklist (burners, oven, fridge space, gate code) is already filled in.
3. **Money is stored in cents** (whole numbers), which avoids rounding errors like $0.30000000004.
4. **Shopping lists are computed, not stored.** Only your shopping *actions* are saved.
5. **Prep tasks are generated, then owned by you.** The app drafts a prep plan from recipe
   prep notes; after that the tasks are yours to reorder, assign and edit. If the menu changes,
   "Add missing from menu" adds tasks for the new dishes without wiping your edits.
6. **Menu items can have their own guest count.** For example, 3 vegetarian guests get the mushroom
   entrée while 9 get the steak. Passed appetizers can be "2 pieces per guest".
7. **Recipe ingredients know how they scale.** Each ingredient line is *Linear* (doubles when
   the recipe doubles), *Fixed* (a bay leaf stays a bay leaf) or *Partial* (salt, spice, frying oil:
   scales at, say, 70% of the linear rate). Each line can have a scaling note.
8. **Platforms are editable records**, not hard-coded percentages. If GigSalad changes its fees,
   you update one number.
9. **Everything has `createdAt`/`updatedAt`**, which future analytics and the AI assistant will use.
10. **Pantry staples** (salt, oils, flour…) count toward food cost but appear as "check the pantry"
    instead of "buy a 25 lb bag" on shopping lists.
11. **Recipe quantities are "as used" (after trimming).** An ingredient's usable-yield % converts that
    into how much to buy — e.g. 3 lb trimmed tenderloin at 72% yield → buy 4¼ lb.
12. **Actual labor only counts shifts marked Completed or Paid** (or with an actual pay entered), so
    projected vs actual never double-counts work that hasn't happened.

---

## 5. How information flows (the "connected" principle)

| You do this… | …and this updates automatically |
|---|---|
| Change guest count | Recipe scaling → shopping quantities → projected food cost → margin |
| Add/remove a dish | Shopping list, food cost, "Generate prep" suggestions |
| Update an ingredient price | Every recipe, dish and event food cost using it |
| Assign staff | Projected labor → profit and margin; "Staffing incomplete" alert clears |
| Enter actual shopping prices or receipts | Actual food cost → Projected vs Actual |
| Change the booking platform | Commission and processing fees → profit |
| Record a payment | Outstanding balance, payment status, dashboard totals |
| Mark a lead Booked | "Convert" creates the Client + Event with everything already entered |
| Fill in the kitchen checklist | "Kitchen info missing" alert clears |

The **Needs Attention** list is generated by a rules engine (`src/lib/domain/attention.ts`)
that reads your data and decides what matters. Each rule has a priority (urgent, soon or
heads-up) and links straight to the fix.

---

## 6. Navigation & pages

```
/login
/                       Dashboard (greeting, snapshot, Needs Attention, upcoming events, calendar)
/calendar               Month · Week · Agenda
/leads                  Pipeline board (drag & drop) + list; /leads/new, /leads/[id]
/clients                Directory; /clients/[id] profile + relationship timeline
/events                 List; /events/new; /events/[id] Event Workspace with tabs:
                          Overview · Menu · Guests & Dietary · Venue & Kitchen · Staff ·
                          Shopping · Prep · Equipment · Financials · Notes & Review
/events/[id]/live       Day-of Event Mode (phone-on-the-counter view)
/events/[id]/shop       Shopping Mode (big one-handed checkboxes)
/dishes                 Dish Library with filters; /dishes/[id]
/recipes                Recipe database; /recipes/[id] with live scaler
/ingredients            Ingredient & pricing database
/shopping               All upcoming shopping lists
/prep                   Prep across upcoming events
/staff                  Staff directory; /staff/[id]
/equipment              Inventory + conflicts
/financials             Financial dashboard with date filters
/settings               Business rules (margins, mileage), platforms & fees
Global search           ⌘K / search button on every page
```

On **mobile** the sidebar becomes a bottom tab bar (Home, Calendar, Events, Shop, More)
tuned to what you use on your feet: today, the calendar, event details, shopping, prep and
day-of mode.

---

## 7. Design system

**Mood:** a well-set table: calm, warm and precise.

- **Palette.** Ivory `#FAF7F2` background, warm-white cards, espresso `#2B2320` text, taupe/stone
  secondary text, and restrained **wine** `#7A2E3A` as the single accent. Status colors are
  muted (sage, amber, clay) rather than traffic-light bright.
- **Typography.** *Cormorant Garamond* (editorial serif) for page titles, greetings and big
  numbers. *Inter* for everything functional. Numbers use tabular figures so columns line up.
- **Components** (`src/components/ui`): Card, Button, Badge/StatusPill, Stat, Tabs, Sheet/Dialog,
  Field inputs, EmptyState, Avatar, ProgressRing, Money, DateBadge, SectionHeader.
- **Status system.** One mapping file (`src/lib/status.ts`) defines the label and tone for every
  status in the app, so "Confirmed" looks the same everywhere.
- **Motion.** Short (150–250 ms), eased transitions on hover, tab change and drawers. No bouncing.

---

## 8. Implementation phases

| Stage | Contents |
|---|---|
| 0 | This plan |
| 1 | Foundation: database schema, realistic sample data, login, app shell, navigation, design system |
| 2 | Domain engine with automated tests: units, scaling, costing, shopping, profitability, fees, attention rules |
| 3 | Dashboard + dashboard calendar + full calendar |
| 4 | Leads pipeline, lead conversion, clients |
| 5 | Event workspace, venue/kitchen checklist, menu builder, dish library, recipes, ingredients |
| 6 | Shopping mode, prep planner, day-of mode, staff, equipment & packing |
| 7 | Financials, platform fee calculator, projected vs actual, search, duplicate event, post-event review |

Each stage leaves the app working.

---

## 9. Future features (planned for, not built)

| Future feature | What's already in place |
|---|---|
| Client portal & menu approval | `Menu.status` (Draft/Sent/Approved), `User.role`, a clean client-facing menu layout |
| Proposals, invoices, online payments | `Payment` model, event financials, platform config (Stripe slots in beside `Payment`) |
| Contracts, questionnaires | Event-scoped records; add `Document` model later |
| Calendar sync (Google/iCloud) | `CalendarEntry` has `source` + `externalId`; calendar items come from one function |
| Automated reminders/emails/texts | Attention rules already compute *what* needs a reminder; add a sender later |
| Staff portal | `User.role = STAFF`, `StaffMember` ↔ `StaffAssignment` |
| Kitchen photos, marketing library | `Attachment` model; needs a file storage provider (see decisions) |
| Inventory deduction | Equipment quantities exist; pantry inventory would attach to `Ingredient` |
| Analytics | Projected vs actual stored per event; review data per event |
| **AI assistant** | All business logic lives in plain, typed functions (`src/lib/domain`) that an AI tool layer can call directly. Postgres supports pgvector for semantic search. |

---

## 10. Decisions for you (the owner)

0. **Your own time.** "Profit" today is what's left *before* paying yourself as chef. If you'd rather
   see profit after a chef fee, we can add an "owner hourly rate" to Settings and include your hours
   as a cost on every event. Recommended once you've used the numbers for a few weeks.

1. **Hosting.** Recommended: Vercel + Neon. When you're ready I'll prepare step-by-step instructions; setup takes about 20 minutes.
2. **Photo storage.** Kitchen and event photos need a file storage service (Vercel Blob or Supabase
   Storage, a few dollars a month). The data model is ready. I recommend adding uploads once hosting is chosen.
3. **Login.** V1 uses email + password for one owner account. Staff logins come later.
4. **Default business rules** (editable in Settings): target margin 45%, minimum acceptable margin
   35%, mileage $0.70/mile, card processing 2.9% + $0.30. Adjust these to your real numbers.
