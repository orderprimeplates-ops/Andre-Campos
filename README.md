# Prime Plates HQ

The internal operating system for **Prime Plates** — private chef & catering.
Inquiries, clients, events, menus, recipes, food costing, shopping, prep, staffing,
equipment, day-of execution and profitability in one place.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full plan: stack, data model,
how information flows, design system and future roadmap.

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

## Project layout

```
prisma/schema.prisma     The database: every table and relationship
prisma/seed.ts           Realistic sample data
src/lib/domain/          The engine — scaling, costing, shopping, profit, fees, alerts (pure, tested)
src/lib/server/          Database access, auth, page data loaders (server-only)
src/app/(app)/           Pages behind login
src/components/          Design system (ui/) and feature components
```
