import Link from "next/link";
import { db } from "@/lib/server/db";
import { fromISODate, type ISODate } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { Card } from "@/components/ui/card";

/**
 * Money that isn't simply "yours": deposits for events not yet held, and sales tax owed to the state.
 * Plus everything spent this year. Each figure links to the records behind it.
 */
export async function CashPosition({ today, year }: { today: ISODate; year: string }) {
  const yearStart = fromISODate(`${year}-01-01`);
  const todayDate = fromISODate(today);
  const [held, tax, expenses] = await Promise.all([
    db.payment.findMany({
      where: { kind: { not: "TIP" }, receivedOn: { lte: todayDate }, event: { date: { gt: todayDate }, status: { not: "CANCELLED" } } },
      select: { amountCents: true, salesTaxCents: true, eventId: true },
    }),
    db.payment.aggregate({ where: { kind: { not: "TIP" }, receivedOn: { gte: yearStart, lte: todayDate } }, _sum: { salesTaxCents: true } }),
    db.eventExpense.findMany({
      where: { kind: "ACTUAL", OR: [{ date: { gte: yearStart, lte: todayDate } }, { date: null, createdAt: { gte: yearStart } }] },
      select: { amountCents: true, eventId: true },
    }),
  ]);
  const heldCents = held.reduce((s, p) => s + p.amountCents - p.salesTaxCents, 0);
  const heldEvents = new Set(held.map((p) => p.eventId)).size;
  const spent = expenses.reduce((s, x) => s + x.amountCents, 0);
  const general = expenses.filter((x) => !x.eventId).reduce((s, x) => s + x.amountCents, 0);

  const tiles = [
    { label: "Client deposits held", value: formatMoney(heldCents), note: heldEvents ? `paid for ${heldEvents} upcoming event${heldEvents === 1 ? "" : "s"} — work not done yet` : "none right now", href: "/money?tab=bookkeeping" },
    { label: `Sales tax collected ${year}`, value: formatMoney(tax._sum.salesTaxCents ?? 0, { exact: true }), note: "owed to Florida — not revenue", href: "/money?tab=bookkeeping" },
    { label: `Recorded expenses ${year}`, value: formatMoney(spent), note: `${formatMoney(spent - general)} on events · ${formatMoney(general)} general`, href: "/money?tab=bookkeeping" },
  ];
  return (
    <section>
      <div className="eyebrow mb-2">Cash & obligations</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="block">
            <Card className="h-full p-4 transition-colors hover:border-line-strong sm:p-5">
              <div className="text-[0.8125rem] text-ink-3">{t.label}</div>
              <div className="mt-1.5 font-display text-[1.75rem] leading-none tabular">{t.value}</div>
              <div className="mt-1.5 text-xs text-ink-3">{t.note}</div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
