import { Smartphone } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import { getEventShopping } from "@/lib/server/shopping";
import { formatDate, toISODate } from "@/lib/domain/dates";
import { ShoppingList } from "@/components/shopping/shopping-list";
import { ButtonLink } from "@/components/ui/button";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export async function ShoppingTab({ ws }: { ws: WS }) {
  const { event: e } = ws;
  const data = await getEventShopping(e.id);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-3">
          Built from the menu for <strong className="font-medium text-ink">{e.guestCount} guests</strong> — recipes scaled, duplicates combined, converted to how you buy them.
          {e.shoppingDate && <> Shopping day: <strong className="font-medium text-ink">{formatDate.medium(toISODate(e.shoppingDate))}</strong>.</>}
        </p>
        <ButtonLink href={`/events/${e.id}/shop`} variant="secondary" size="sm"><Smartphone className="h-4 w-4" />Shopping mode</ButtonLink>
      </div>
      <ShoppingList eventId={e.id} rows={data.rows} vendors={data.vendors} totals={data.totals} />
    </div>
  );
}
