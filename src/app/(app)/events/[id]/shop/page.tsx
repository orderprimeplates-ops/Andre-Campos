import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/server/db";
import { getEventShopping } from "@/lib/server/shopping";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { ShoppingList } from "@/components/shopping/shopping-list";

export const metadata = { title: "Shopping mode" };

/** Phone-first shopping: big targets, grouped by store, one-handed. */
export default async function ShopModePage({ params }: PageProps<"/events/[id]/shop">) {
  const { id } = await params;
  const exists = await db.event.findUnique({ where: { id }, select: { id: true } });
  if (!exists) notFound();
  const data = await getEventShopping(id);
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/events/${id}?tab=shopping`} className="mb-3 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ChevronLeft className="h-4 w-4" />Event
      </Link>
      <div className="mb-4">
        <div className="eyebrow">Shopping · {data.event.guestCount} guests · {formatDate.medium(toISODate(data.event.date))}</div>
        <h1 className="font-display text-[2rem] leading-tight">{data.event.name}</h1>
      </div>
      <ShoppingList eventId={id} rows={data.rows} vendors={data.vendors} totals={data.totals} mode="shop" />
    </div>
  );
}
