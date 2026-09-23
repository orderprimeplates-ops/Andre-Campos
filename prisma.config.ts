import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations prefer a direct (unpooled) connection when the host provides one — Neon via Vercel
// sets DATABASE_URL_UNPOOLED automatically. The running app always uses DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
