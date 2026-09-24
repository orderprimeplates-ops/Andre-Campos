// Finds the Postgres connection string wherever the host put it. Vercel's Neon integration names
// its variables DATABASE_URL / DATABASE_URL_UNPOOLED by default, but a custom prefix chosen when
// connecting the database (e.g. STORAGE_URL, PRIME_PLATES_DATABASE_URL) or an older Postgres
// integration (POSTGRES_URL) changes the names — so fall back to any variable holding a postgres URL.

type Env = Record<string, string | undefined>;

const isPostgresUrl = (v: string | undefined): v is string =>
  !!v && /^postgres(ql)?:\/\//i.test(v.trim());

const isDirect = (key: string) => /UNPOOLED|NON_POOLING|DIRECT/i.test(key);

/** Pooled URL for the running app; `direct` prefers an unpooled URL for migrations. */
export function resolveDatabaseUrl(env: Env = process.env, { direct = false } = {}): string | undefined {
  const preferred = direct
    ? ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]
    : ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
  for (const key of preferred) if (isPostgresUrl(env[key])) return env[key]!.trim();

  const candidates = Object.keys(env)
    .filter((k) => isPostgresUrl(env[k]))
    .sort((a, b) => Number(isDirect(b)) - Number(isDirect(a)));
  const pick = direct ? candidates[0] : (candidates.find((k) => !isDirect(k)) ?? candidates[0]);
  return pick ? env[pick]!.trim() : undefined;
}

/** Names (never values) of variables that look database-related — safe to print in build logs. */
export function databaseVariableNames(env: Env = process.env): string[] {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|NEON|^PG/i.test(k)).sort();
}
