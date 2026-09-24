import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../../database-url";

const pooled = "postgresql://u:p@ep-x-pooler.neon.tech/db";
const direct = "postgresql://u:p@ep-x.neon.tech/db";

describe("resolveDatabaseUrl", () => {
  it("uses the standard Neon names", () => {
    const env = { DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: direct };
    expect(resolveDatabaseUrl(env)).toBe(pooled);
    expect(resolveDatabaseUrl(env, { direct: true })).toBe(direct);
  });
  it("finds variables with a custom prefix", () => {
    const env = { STORAGE_DATABASE_URL: pooled, STORAGE_DATABASE_URL_UNPOOLED: direct, OTHER: "x" };
    expect(resolveDatabaseUrl(env)).toBe(pooled);
    expect(resolveDatabaseUrl(env, { direct: true })).toBe(direct);
  });
  it("handles Vercel's full prefixed set and never picks the NO_SSL URL", () => {
    const env = {
      primeplates_POSTGRES_URL_NO_SSL: "postgresql://nossl/db",
      primeplates_NEON_AUTH_BASE_URL: "https://auth",
      primeplates_POSTGRES_URL: pooled,
      primeplates_DATABASE_URL_UNPOOLED: direct,
      primeplates_DATABASE_URL: pooled,
    };
    expect(resolveDatabaseUrl(env)).toBe(pooled);
    expect(resolveDatabaseUrl(env, { direct: true })).toBe(direct);
  });
  it("ignores empty and non-postgres values", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "", REDIS_URL: "redis://x" })).toBeUndefined();
  });
});
