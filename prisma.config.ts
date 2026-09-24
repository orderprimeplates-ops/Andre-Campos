import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations prefer a direct (unpooled) connection when the host provides one. Neon via Vercel
// sets DATABASE_URL_UNPOOLED (and older integrations POSTGRES_URL_NON_POOLING) automatically.
const url =
  process.env["DATABASE_URL_UNPOOLED"] ??
  process.env["POSTGRES_URL_NON_POOLING"] ??
  process.env["DATABASE_URL"] ??
  process.env["POSTGRES_PRISMA_URL"] ??
  process.env["POSTGRES_URL"];

if (!url) {
  console.warn(
    "\n[Prime Plates] No database is connected yet. In Vercel: Storage tab → Create Database → Neon → " +
      "connect it to all environments, then redeploy. See docs/DEPLOYING.md, Step 3.\n",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
