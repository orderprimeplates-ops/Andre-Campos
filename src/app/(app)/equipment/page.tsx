import Link from "next/link";
import { Plus, TriangleAlert } from "lucide-react";
import { db } from "@/lib/server/db";
import { getToday } from "@/lib/server/settings";
import { addDays, formatDate, fromISODate, toISODate } from "@/lib/domain/dates";
import { CONDITION, metaOf } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import { saveEquipment } from "./actions";

export const metadata = { title: "Equipment" };

type Item = Awaited<ReturnType<typeof db.equipmentItem.findMany>>[number];

function Fields({ i, categories }: { i?: Item; categories: string[] }) {
  return (
    <div className="space-y-4">
      <FormGrid>
        <Field label="Item" name="name"><Input id="name" name="name" required defaultValue={i?.name} /></Field>
        <Field label="Category" name="category"><Input id="category" name="category" defaultValue={i?.category ?? ""} list="equip-cats" /></Field>
        <Field label="Quantity owned" name="quantityOwned"><Input id="quantityOwned" name="quantityOwned" type="number" min={0} defaultValue={i?.quantityOwned ?? 1} /></Field>
        <Field label="Out of service" name="quantityOutOfService" hint="broken, lent out"><Input id="quantityOutOfService" name="quantityOutOfService" type="number" min={0} defaultValue={i?.quantityOutOfService ?? 0} /></Field>
        <Field label="Storage location" name="storageLocation"><Input id="storageLocation" name="storageLocation" defaultValue={i?.storageLocation ?? ""} /></Field>
        <Field label="Condition" name="condition"><Select id="condition" name="condition" defaultValue={i?.condition ?? "GOOD"}>{Object.entries(CONDITION).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
      </FormGrid>
      <datalist id="equip-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={i?.notes ?? ""} /></Field>
    </div>
  );
}

export default async function EquipmentPage() {
  const { today } = await getToday();
  const [items, uses] = await Promise.all([
    db.equipmentItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.eventEquipment.findMany({
      where: { event: { status: { notIn: ["CANCELLED", "COMPLETED"] }, date: { gte: fromISODate(today), lte: fromISODate(addDays(today, 60)) } } },
      include: { event: { select: { id: true, name: true, date: true } } },
    }),
  ]);
  const categories = [...new Set(items.map((i) => i.category))];

  // Demand per item per day across upcoming events.
  const shortages: { item: string; date: string; need: number; have: number; events: { id: string; name: string }[] }[] = [];
  for (const i of items) {
    const byDay = new Map<string, typeof uses>();
    for (const u of uses.filter((u) => u.equipmentItemId === i.id)) {
      const d = toISODate(u.event.date);
      byDay.set(d, [...(byDay.get(d) ?? []), u]);
    }
    const have = i.quantityOwned - i.quantityOutOfService;
    for (const [d, list] of byDay) {
      const need = list.reduce((s, u) => s + u.quantity, 0);
      if (need > have) shortages.push({ item: i.name, date: d, need, have, events: list.map((u) => u.event) });
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Equipment"
        description={`${items.length} items across ${categories.length} categories`}
        actions={<ActionDialog trigger={<><Plus className="h-4 w-4" />Item</>} triggerVariant="primary" title="Add equipment" action={saveEquipment}><Fields categories={categories} /></ActionDialog>}
      />
      {shortages.length > 0 && (
        <Card className="mb-6 border-clay/25 bg-clay-soft/50 p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold text-clay"><TriangleAlert className="h-5 w-5" />Upcoming shortages</div>
          <ul className="space-y-1.5 text-sm">
            {shortages.map((s, i) => (
              <li key={i}>
                <strong className="font-medium">{s.item}</strong> on {formatDate.medium(s.date)} — need {s.need}, have {s.have}.{" "}
                <span className="text-ink-2">{s.events.map((e, n) => <span key={e.id}>{n ? ", " : ""}<Link href={`/events/${e.id}?tab=equipment`} className="underline decoration-clay/40 hover:text-clay">{e.name}</Link></span>)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="space-y-6">
        {categories.map((c) => (
          <section key={c}>
            <h2 className="eyebrow mb-2 px-1 text-ink-2">{c}</h2>
            <Card className="overflow-hidden">
              {items.filter((i) => i.category === c).map((i) => {
                const cond = metaOf(CONDITION, i.condition);
                const next = uses.filter((u) => u.equipmentItemId === i.id).sort((a, b) => a.event.date.getTime() - b.event.date.getTime())[0];
                return (
                  <ActionDialog key={i.id} triggerClassName="block w-full border-b border-line/60 text-left transition-colors last:border-0 hover:bg-sand/40" title={i.name} action={saveEquipment} hidden={{ id: i.id }}
                    trigger={
                      <div className="grid grid-cols-2 items-center gap-x-4 gap-y-1 px-5 py-3 text-sm md:grid-cols-[2fr_1fr_1fr_1.4fr]">
                        <span className="min-w-0"><span className="block truncate font-medium text-ink">{i.name}</span><span className="text-xs text-ink-3">{i.storageLocation ?? "No location"}</span></span>
                        <span className="text-right tabular md:text-left"><span className="font-display text-xl">{i.quantityOwned - i.quantityOutOfService}</span><span className="text-ink-3"> available{i.quantityOutOfService ? ` of ${i.quantityOwned}` : ""}</span></span>
                        <span><Badge tone={cond.tone} size="xs">{cond.label}</Badge></span>
                        <span className="truncate text-xs text-ink-3">{next ? `Next: ${next.quantity} for ${next.event.name} · ${formatDate.short(toISODate(next.event.date))}` : i.notes ?? ""}</span>
                      </div>
                    }>
                    <Fields i={i} categories={categories} />
                  </ActionDialog>
                );
              })}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
