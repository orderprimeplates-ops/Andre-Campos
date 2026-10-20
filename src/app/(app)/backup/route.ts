import { getCurrentUser } from "@/lib/server/auth";
import { buildBackup } from "@/lib/server/backup";
import { getToday } from "@/lib/server/settings";

export const runtime = "nodejs";

/** Owner-only download of every record (receipt photos come separately in parts). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return new Response("Not found", { status: 404 });
  const [backup, { today }] = await Promise.all([buildBackup(), getToday()]);
  return new Response(JSON.stringify(backup), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prime-plates-backup-${today}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
