import "server-only";
import { db } from "./db";

/**
 * Full, restorable backup of every table, read straight from Postgres so nothing is missed when the
 * schema grows. Receipt photo bytes are exported separately in parts (Vercel caps a single response
 * at ~4.5 MB); the main file keeps every receipt row with an empty placeholder for the bytes.
 */

export const BACKUP_FORMAT = 1;
const RECEIPT_PART_BYTES = 3_000_000;

async function tableNames(): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' ORDER BY tablename`,
  );
  return rows.map((r) => r.tablename);
}

async function receiptParts(): Promise<string[][]> {
  const rows = await db.$queryRawUnsafe<{ id: string; size: number }[]>(
    `SELECT id, octet_length(data)::int AS size FROM "ExpenseReceipt" ORDER BY id`,
  );
  const parts: string[][] = [];
  let cur: string[] = [];
  let bytes = 0;
  for (const r of rows) {
    if (cur.length && bytes + r.size > RECEIPT_PART_BYTES) {
      parts.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(r.id);
    bytes += r.size;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

export async function buildBackup() {
  const [tables, migrations, parts] = await Promise.all([
    tableNames(),
    db.$queryRawUnsafe<{ migration_name: string }[]>(
      `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
    ),
    receiptParts(),
  ]);
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const t of tables) {
    // Every column exactly as stored. Receipt bytes are replaced by an empty value here and shipped in parts.
    const sql =
      t === "ExpenseReceipt"
        ? `SELECT coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('data', '\\x')), '[]'::jsonb) AS rows FROM "ExpenseReceipt" x`
        : `SELECT coalesce(json_agg(x), '[]'::json) AS rows FROM "${t}" x`;
    const [{ rows }] = await db.$queryRawUnsafe<{ rows: unknown[] }[]>(sql);
    data[t] = rows;
    counts[t] = rows.length;
  }
  return {
    meta: {
      app: "Prime Plates HQ",
      format: BACKUP_FORMAT,
      createdAt: new Date().toISOString(),
      migrations: migrations.map((m) => m.migration_name),
      counts,
      receiptParts: parts.length,
    },
    tables: data,
  };
}

export async function buildReceiptPart(part: number) {
  const parts = await receiptParts();
  const ids = parts[part - 1];
  if (!ids) return null;
  const rows = await db.$queryRawUnsafe<{ id: string; data: string }[]>(
    `SELECT id, encode(data, 'base64') AS data FROM "ExpenseReceipt" WHERE id = ANY($1::text[]) ORDER BY id`,
    ids,
  );
  return { meta: { app: "Prime Plates HQ", kind: "receipts", format: BACKUP_FORMAT, part, of: parts.length }, receipts: rows };
}

export async function backupSummary() {
  const [parts, [{ n }]] = await Promise.all([
    receiptParts(),
    db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "ExpenseReceipt"`),
  ]);
  return { receiptParts: parts.length, receipts: n };
}
