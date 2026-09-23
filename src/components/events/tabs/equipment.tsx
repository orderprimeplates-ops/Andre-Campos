import { PackageOpen, Plus, TriangleAlert } from "lucide-react";
import type { getEventWorkspace } from "@/lib/server/workspace";
import type { EquipmentConflict } from "@/lib/server/equipment";
import { db } from "@/lib/server/db";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { ActionDialog } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select } from "@/components/ui/field";
import { PackingList } from "@/components/equipment/packing-list";
import { addEventEquipment } from "@/app/(app)/events/actions/equipment";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export async function EquipmentTab({ ws, conflicts }: { ws: WS; conflicts: EquipmentConflict[] }) {
  const { event: e } = ws;
  const inventory = await db.equipmentItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  const short = new Set(conflicts.map((c) => c.itemId));
  const categories = [...new Set(inventory.map((i) => i.category))];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
      <Card className="min-w-0">
        <CardHeader
          title="Packing list"
          description="Tap a stage to move an item along: required → packed → loaded → on site → returned."
          action={
            <ActionDialog trigger={<><Plus className="h-4 w-4" />Add</>} triggerSize="sm" triggerVariant="primary" title="Add equipment" action={addEventEquipment} hidden={{ eventId: e.id }}>
              <Field label="Item" name="equipmentItemId">
                <Select id="equipmentItemId" name="equipmentItemId" required defaultValue="">
                  <option value="" disabled>Choose from inventory…</option>
                  {categories.map((c) => (
                    <optgroup key={c} label={c}>
                      {inventory.filter((i) => i.category === c).map((i) => (
                        <option key={i.id} value={i.id}>{i.name} · {i.quantityOwned - i.quantityOutOfService} available</option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
              </Field>
              <FormGrid>
                <Field label="Quantity" name="quantity"><Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} /></Field>
                <Field label="Note" name="notes"><Input id="notes" name="notes" placeholder="For the carving station" /></Field>
              </FormGrid>
            </ActionDialog>
          }
        />
        <CardBody>
          {e.equipment.length === 0 ? (
            <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="Nothing on the list">Add what needs to go in the van. Items are checked against what you own.</EmptyState>
          ) : (
            <PackingList
              eventId={e.id}
              rows={e.equipment.map((x) => ({
                id: x.id, name: x.equipmentItem.name, category: x.equipmentItem.category, quantity: x.quantity,
                available: x.equipmentItem.quantityOwned - x.equipmentItem.quantityOutOfService, status: x.status,
                notes: x.notes, location: x.equipmentItem.storageLocation, short: short.has(x.equipmentItemId),
              }))}
            />
          )}
        </CardBody>
      </Card>
      <aside className="space-y-4">
        {conflicts.length > 0 ? (
          <Card className="border-clay/25 bg-clay-soft/50">
            <CardBody className="space-y-3 pt-5">
              <div className="flex items-center gap-2 text-clay"><TriangleAlert className="h-5 w-5" /><span className="font-semibold">Not enough equipment</span></div>
              {conflicts.map((c) => (
                <div key={c.itemId} className="text-sm text-ink">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-ink-2">
                    Need {c.neededOnDate} that day, own {c.available} — <strong className="font-semibold text-clay">short {c.shortBy}</strong>.
                  </div>
                  {c.otherEvents.length > 0 && <div className="text-xs text-ink-3">Also needed by {c.otherEvents.join(", ")}</div>}
                </div>
              ))}
              <p className="text-xs text-ink-3">Rent the difference or borrow — add the cost under Financials → Rentals.</p>
            </CardBody>
          </Card>
        ) : (
          e.equipment.length > 0 && (
            <Card className="bg-sage-soft/40"><CardBody className="pt-5 text-sm text-sage">Everything on this list is covered by your inventory.</CardBody></Card>
          )
        )}
      </aside>
    </div>
  );
}
