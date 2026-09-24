// Finds the Postgres connection string wherever the host put it. Vercel's Neon integration names
// its variables DATABASE_URL / DATABASE_URL_UNPOOLED by default, but a custom prefix chosen when
// connecting the database (e.g. primeplates_DATABASE_URL) or an older Postgres
// integration (POSTGRES_URL) changes the names — so also accept the standard names behind any prefix.

type Env = Record<string, string | undefined>;

const isPostgresUrl = (v: string | undefined): v is string =>
  !!v && /^postgres(ql)?:\/\//i.test(v.trim());

/** Pooled URL for the running app; `direct` prefers an unpooled URL for migrations. */
export function resolveDatabaseUrl(env: Env = process.env, { direct = false } = {}): string | undefined {
  const pooled = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];
  const unpooled = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"];
  const order = direct ? [...unpooled, ...pooled] : [...pooled, ...unpooled];
  // Exact names first, then the same names behind any prefix (e.g. primeplates_DATABASE_URL).
  for (const name of order) if (isPostgresUrl(env[name])) return env[name]!.trim();
  for (const name of order) {
    const key = Object.keys(env).find((k) => k.toUpperCase().endsWith(`_${name}`) && isPostgresUrl(env[k]));
    if (key) return env[key]!.trim();
  }
  return undefined;
}

/** Names (never values) of variables that look database-related — safe to print in build logs. */
export function databaseVariableNames(env: Env = process.env): string[] {
  return Object.keys(env).filter((k) => /DATABASE|POSTGRES|NEON|^PG/i.test(k)).sort();
}
