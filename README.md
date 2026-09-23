# Prime Plates HQ

The internal operating system for **Prime Plates** — private chef & catering.
Inquiries, clients, events, menus, recipes, food costing, shopping, prep, staffing,
equipment, day-of execution and profitability in one place.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full plan: stack, data model,
how information flows, design system and future roadmap.

## What's in Version 1

| Area | What it does |
|---|---|
| **Dashboard** | Greeting, snapshot (upcoming revenue, outstanding balances, events, leads), *Needs Attention*, month calendar, upcoming events with readiness |
| **Calendar** | Month / week / agenda views of events, deadlines, shopping and prep days, plus your own entries |
| **Leads** | Drag-and-drop pipeline, follow-up nudges, lost reasons, one-click conversion to client + event |
| **Clients** | Profiles with allergies, preferences, addresses, lifetime spend and a relationship timeline |
| **Event Workspace** | Overview · Menu · Guests & Dietary · Venue & Kitchen · Staff · Shopping · Prep · Equipment · Financials · Notes & Review |
| **Menu Builder** | Course templates, drag-to-reorder, dish picker, custom dishes, per-dish guest counts, allergy cross-check, client-facing menu card |
| **Dish Library / Recipes / Ingredients** | Dishes built from recipes, recipes built from priced ingredients; recipe scaler with partial/fixed scaling and manual overrides |
| **Shopping** | Auto-generated, combined, unit-converted lists grouped by aisle or store; phone Shopping Mode; pantry staples; actual prices |
| **Prep** | Prep plans drafted from recipes, grouped by day, reorderable and assignable; cross-event prep view |
| **Day-of Mode** | Full-screen phone view: clock, now/next, fire times, tap-to-check timeline, timers, team, venue access |
| **Staff & Equipment** | Roster, assignments, pay tracking, double-booking warnings; inventory, packing stages, shortage warnings |
| **Financials** | Price tester with live margin, recommended/minimum price, platform fees & net-target pricing, projected vs actual, financial dashboard |
| **Search** | ⌘K / search icon — clients, events (including dates like “Oct 3”), dishes, recipes, ingredients, staff, venues, leads |

## Putting it online

Step-by-step, no coding needed: **[docs/DEPLOYING.md](docs/DEPLOYING.md)**. The first visit to a
brand-new install shows a one-time setup page where you create the owner account.

## Running it locally

Requirements: Node 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # then set DATABASE_URL and your owner login
npm run db:migrate            # create the database tables
npm run db:seed               # load realistic sample data (wipes business data!)
npm run dev                   # http://localhost:3000
```

Sign in with the `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` from your `.env`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app in development mode |
| `npm test` | Run the automated tests for costing, scaling, fees, margins and alerts |
| `npm run typecheck` | Check the code for type errors |
| `npm run lint` | Check code style |
| `npm run db:migrate` | Apply database changes during development |
| `npm run db:deploy` | Apply database changes in production |
| `npm run db:reset` | Rebuild the database from scratch and reseed |
| `npx tsx scripts/check-costs.mts` | Print every event's food cost, margin and a sample shopping list (sanity check) |

## Project layout

```
prisma/schema.prisma     The database: every table and relationship
prisma/seed.ts           Realistic sample data
src/lib/domain/          The engine — scaling, costing, shopping, profit, fees, alerts (pure, tested)
src/lib/server/          Database access, auth, page data loaders (server-only)
src/app/(app)/           Pages behind login
src/components/          Design system (ui/) and feature components
```
