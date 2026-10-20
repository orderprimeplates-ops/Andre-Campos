import { getCurrentUser } from "@/lib/server/auth";
import { buildReceiptPart } from "@/lib/server/backup";
import { getToday } from "@/lib/server/settings";

export const runtime = "nodejs";

/** Owner-only download of receipt photos, part N of the backup. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return new Response("Not found", { status: 404 });
  const part = Number(new URL(req.url).searchParams.get("part") ?? "1");
  if (!Number.isInteger(part) || part < 1) return new Response("Not found", { status: 404 });
  const [file, { today }] = await Promise.all([buildReceiptPart(part), getToday()]);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(file), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prime-plates-backup-${today}-receipts-${part}-of-${file.meta.of}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
