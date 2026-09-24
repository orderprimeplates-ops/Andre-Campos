import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseVariableNames, resolveDatabaseUrl } from "./src/lib/database-url";

// Migrations prefer a direct (unpooled) connection when the host provides one.
const url = resolveDatabaseUrl(process.env, { direct: true });

if (!url) {
  const seen = databaseVariableNames();
  console.warn(
    "\n[Prime Plates] No database is connected to this deployment.\n" +
      "  In Vercel: Storage tab → Create Database → Neon → connect it to Production, Preview and\n" +
      "  Development, then redeploy. See docs/DEPLOYING.md, Step 3.\n" +
      `  Database-related variables found: ${seen.length ? seen.join(", ") : "none"}\n`,
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
