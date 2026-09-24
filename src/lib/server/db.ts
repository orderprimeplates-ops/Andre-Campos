import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One client per server process (Next.js dev hot-reload would otherwise open many pools).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Vercel's Neon integration sets DATABASE_URL; older Postgres integrations use POSTGRES_URL.
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new Error("No database connected: DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
