import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";

/** Receipt photos are private: served only to a signed-in user, never cached publicly. */
export async function GET(_req: Request, { params }: RouteContext<"/receipts/[id]">) {
  if (!(await getCurrentUser())) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const r = await db.expenseReceipt.findUnique({ where: { id }, select: { mimeType: true, data: true } });
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(r.data), {
    headers: { "Content-Type": r.mimeType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
