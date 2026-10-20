# Backups

Everything in Prime Plates HQ lives in one PostgreSQL database (Neon, connected through Vercel).

## Two kinds of backup

1. **Neon branch (recommended before big changes).** Neon → Branches → Create branch from `main`,
   *Branch data and schema*, Auto-delete **Never**. A complete copy, restorable from Neon itself.
   Never press **Reset from parent** on a backup branch — that overwrites it with today's data.
2. **Download from the app.** Settings → Backup → **Download full backup**, plus every
   **Receipts N of M** file. Keep all files from the same day together, somewhere private.

## Restoring a downloaded backup (technical)

Restores only into an **empty** database that has the same migrations applied. It refuses otherwise,
and runs in one transaction: it either fully succeeds (with row counts verified) or changes nothing.

```bash
DATABASE_URL=postgres://…new-empty-db… npx prisma migrate deploy
DATABASE_URL=postgres://…new-empty-db… npx tsx scripts/restore-backup.mts \
  prime-plates-backup-YYYY-MM-DD.json \
  prime-plates-backup-YYYY-MM-DD-receipts-1-of-2.json prime-plates-backup-YYYY-MM-DD-receipts-2-of-2.json
```

Rows that migrations insert by themselves (the 2026 opening financials) are replaced by the
backup's own copies. Point the app at the restored database by changing its connection in Vercel.
