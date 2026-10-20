/**
 * Restores a Prime Plates HQ backup into an EMPTY database that has the same migrations applied.
 *
 *   DATABASE_URL=postgres://… npx prisma migrate deploy        # create the empty tables first
 *   DATABASE_URL=postgres://… npx tsx scripts/restore-backup.mts backup.json [receipts-1-of-N.json …]
 *
 * Safety: refuses to run if any table already has rows, or if the migrations don't match the backup.
 * Everything is restored in one transaction — it either fully succeeds or changes nothing.
 */
import fs from "node:fs";
import pg from "pg";

const [mainFile, ...receiptFiles] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!mainFile || !url) {
  console.error("Usage: DATABASE_URL=… npx tsx scripts/restore-backup.mts backup.json [receipts-*.json …]");
  process.exit(1);
}

const backup = JSON.parse(fs.readFileSync(mainFile, "utf8"));
if (backup?.meta?.app !== "Prime Plates HQ" || !backup.tables) throw new Error("Not a Prime Plates HQ backup file.");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const migrations = (await client.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY 1`)).rows.map((r) => r.migration_name);
  if (JSON.stringify(migrations) !== JSON.stringify(backup.meta.migrations)) {
    throw new Error(`Migrations differ.\n  backup: ${backup.meta.migrations.join(", ")}\n  target: ${migrations.join(", ")}`);
  }
  const tables: string[] = Object.keys(backup.tables);
  // A freshly migrated database already holds rows that migrations insert (the 2026 opening financials,
  // ids "opening_…"). Those are replaced by the backup's own rows. Any other data means "not empty".
  const SEEDED_BY_MIGRATIONS = `"HistoricalRevenue" WHERE id LIKE 'opening\\_%'`;
  for (const t of tables) {
    const where = t === "HistoricalRevenue" ? ` WHERE id NOT LIKE 'opening\\_%'` : "";
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${t}"${where}`);
    if (rows[0].n > 0) throw new Error(`Refusing to restore: table "${t}" already has data. Restore only into an empty database.`);
  }

  // Parents before children, from the database's own foreign keys.
  const fks = (await client.query(`
    SELECT c.relname AS child, p.relname AS parent FROM pg_constraint k
    JOIN pg_class c ON c.oid = k.conrelid JOIN pg_class p ON p.oid = k.confrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE k.contype = 'f' AND n.nspname = 'public' AND c.relname <> p.relname`)).rows as { child: string; parent: string }[];
  const order: string[] = [];
  const pending = new Set(tables);
  while (pending.size) {
    const ready = [...pending].filter((t) => !fks.some((f) => f.child === t && pending.has(f.parent)));
    if (!ready.length) throw new Error("Could not order tables (circular references).");
    for (const t of ready.sort()) { order.push(t); pending.delete(t); }
  }

  await client.query("BEGIN");
  await client.query(`DELETE FROM ${SEEDED_BY_MIGRATIONS}`);
  for (const t of order) {
    const rows = backup.tables[t];
    if (!rows.length) continue;
    await client.query(`INSERT INTO "${t}" SELECT * FROM json_populate_recordset(NULL::"${t}", $1::json)`, [JSON.stringify(rows)]);
  }
  let receipts = 0;
  for (const f of receiptFiles) {
    const part = JSON.parse(fs.readFileSync(f, "utf8"));
    if (part?.meta?.kind !== "receipts") throw new Error(`${f} is not a receipts file.`);
    for (const r of part.receipts) {
      const res = await client.query(`UPDATE "ExpenseReceipt" SET data = decode($2, 'base64') WHERE id = $1`, [r.id, r.data]);
      receipts += res.rowCount ?? 0;
    }
  }
  const missing = (await client.query(`SELECT count(*)::int AS n FROM "ExpenseReceipt" WHERE octet_length(data) = 0`)).rows[0].n;
  if (missing > 0) throw new Error(`${missing} receipt photo(s) missing — pass every receipts part file (backup has ${backup.meta.receiptParts}).`);

  for (const t of tables) {
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${t}"`);
    if (rows[0].n !== backup.meta.counts[t]) throw new Error(`Count mismatch in ${t}: ${rows[0].n} vs ${backup.meta.counts[t]}`);
  }
  await client.query("COMMIT");
  console.log(`Restored ${order.length} tables and ${receipts} receipt photo(s) from backup of ${backup.meta.createdAt}. Counts verified.`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Restore failed — nothing was changed.\n" + (e as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}
