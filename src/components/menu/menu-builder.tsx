"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Clock, GripVertical, Loader2, Pencil, Plus, Search, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/domain/money";
import { formatTime } from "@/lib/domain/dates";
import { COURSE } from "@/lib/status";
import { COURSE_TEMPLATES } from "@/lib/menu-templates";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ActionDialog, ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/field";
import {
  addCourse, addDishToCourse, applyCourseTemplate, createCustomDish, deleteCourse, moveMenuItem, removeMenuItem,
  reorderCourses, updateCourse, updateMenuItem,
} from "@/app/(app)/events/actions/menu";

export interface BuilderItem {
  id: string;
  dishId: string;
  name: string;
  description: string | null;
  allergens: string[];
  dietaryTags: string[];
  guestCount: number | null;
  portionsPerGuest: number;
  notes: string | null;
  costPerServingCents: number;
  servings: number;
  totalCents: number;
  componentCount: number;
  inLibrary: boolean;
  conflicts: string[];
}
export interface BuilderCourse {
  id: string;
  name: string;
  fireTime: string | null;
  items: BuilderItem[];
}
export interface LibraryDish {
  id: string;
  name: string;
  description: string | null;
  course: string;
  protein: string | null;
  dietaryTags: string[];
  allergens: string[];
  costPerServingCents: number;
}

export function MenuBuilder({
  menuId, eventId, guestCount, courses, library, recipes,
}: {
  menuId: string | null;
  eventId: string;
  guestCount: number;
  courses: BuilderCourse[];
  library: LibraryDish[];
  recipes: { id: string; name: string }[];
}) {
  const [order, setOrder] = useState(() => courses.map((c) => c.id));
  const [pending, start] = useTransition();
  const [picker, setPicker] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Keep local order in sync when courses are added or removed on the server.
  const ids = courses.map((c) => c.id).join(",");
  const [syncedIds, setSyncedIds] = useState(ids);
  if (ids !== syncedIds) {
    setSyncedIds(ids);
    setOrder(courses.map((c) => c.id));
  }
  const byId = new Map(courses.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as BuilderCourse[];

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id || !menuId) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    start(() => reorderCourses(menuId, next));
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong/70 bg-linen/60 px-6 py-10 text-center">
        <Sparkles className="mx-auto mb-3 h-6 w-6 text-champagne" />
        <div className="font-display text-2xl">Start with a structure</div>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">Pick a course layout — you can rename, reorder or add courses any time.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {Object.keys(COURSE_TEMPLATES).map((t) => (
            <Button key={t} variant="secondary" size="sm" disabled={pending} onClick={() => start(() => applyCourseTemplate(eventId, t))}>
              {t}
            </Button>
          ))}
        </div>
        <div className="mx-auto mt-6 max-w-sm">
          <AddCourseForm eventId={eventId} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext id={`menu-${eventId}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {ordered.map((c) => (
            <CourseCard key={c.id} course={c} guestCount={guestCount} onAddDish={() => setPicker(c.id)} recipes={recipes} />
          ))}
        </SortableContext>
      </DndContext>
      <div className="rounded-2xl border border-dashed border-line-strong/60 p-4">
        <AddCourseForm eventId={eventId} />
      </div>
      <DishPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        library={library}
        courseName={picker ? byId.get(picker)?.name ?? "" : ""}
        onPick={async (dishId) => {
          if (picker) await addDishToCourse(picker, dishId);
        }}
      />
    </div>
  );
}

function AddCourseForm({ eventId }: { eventId: string }) {
  return (
    <ActionForm action={addCourse} hidden={{ eventId }} submitLabel="Add course" resetOnSuccess className="flex flex-col gap-2 sm:flex-row sm:items-end [&>div:last-child]:pt-0">
      <div className="flex-1">
        <Input name="name" placeholder="New course — e.g. Intermezzo" aria-label="Course name" required list="course-names" />
        <datalist id="course-names">{Object.values(COURSE).map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <Input name="fireTime" type="time" aria-label="Fire time" className="sm:w-32" />
    </ActionForm>
  );
}

function CourseCard({ course, guestCount, onAddDish, recipes }: { course: BuilderCourse; guestCount: number; onAddDish: () => void; recipes: { id: string; name: string }[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: course.id });
  const [pending, start] = useTransition();
  const cost = course.items.reduce((s, i) => s + i.totalCents, 0);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-[var(--radius-card)] border border-line/70 bg-linen shadow-[var(--shadow-card)]", isDragging && "relative z-10 shadow-[var(--shadow-pop)]", pending && "opacity-60")}
    >
      <div className="flex items-center gap-2 border-b border-line/70 px-3 py-3 sm:px-4">
        <button type="button" {...attributes} {...listeners} className="cursor-grab touch-none rounded-lg p-1.5 text-ink-4 hover:bg-sand hover:text-ink-2 active:cursor-grabbing" aria-label={`Reorder ${course.name}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[1.35rem] leading-tight">{course.name}</div>
          <div className="flex items-center gap-3 text-xs text-ink-3">
            {course.fireTime && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Fire {formatTime(course.fireTime)}</span>}
            {cost > 0 && <span className="tabular">{formatMoney(cost)} food</span>}
          </div>
        </div>
        <ActionDialog trigger={<Pencil className="h-4 w-4" />} triggerLabel="Edit course" triggerVariant="ghost" triggerSize="icon" title="Edit course" action={updateCourse} hidden={{ courseId: course.id }}>
          <FormGrid>
            <Field label="Course name" name="name"><Input id="name" name="name" defaultValue={course.name} required /></Field>
            <Field label="Fire / serve time" name="fireTime" hint="for Day-of mode"><Input id="fireTime" name="fireTime" type="time" defaultValue={course.fireTime ?? ""} /></Field>
          </FormGrid>
        </ActionDialog>
        <Button variant="ghost" size="icon" title="Delete course" aria-label="Delete course" onClick={() => { if (confirm(`Remove “${course.name}” and its dishes from this menu?`)) start(() => deleteCourse(course.id)); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="divide-y divide-line/60">
        {course.items.map((i, idx) => (
          <MenuItemRow key={i.id} item={i} guestCount={guestCount} first={idx === 0} last={idx === course.items.length - 1} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Button size="sm" variant="quiet" onClick={onAddDish}><Plus className="h-3.5 w-3.5" />Add from library</Button>
        <ActionDialog trigger={<><Sparkles className="h-3.5 w-3.5" />Custom dish</>} triggerVariant="ghost" triggerSize="sm" title="Custom dish" description="A one-off dish for this menu. Link recipes so it flows into shopping, prep and costing." action={createCustomDish} hidden={{ courseId: course.id }} submitLabel="Add dish">
          <Field label="Dish name" name="name"><Input id="name" name="name" required /></Field>
          <Field label="Client-facing description" name="description"><Textarea id="description" name="description" rows={2} /></Field>
          <Field label="Course type" name="course">
            <Select id="course" name="course" defaultValue="ENTREE">{Object.entries(COURSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          </Field>
          <RecipeChecklist recipes={recipes} />
          <label className="flex items-center gap-2.5 text-sm text-ink-2"><input type="checkbox" name="saveToLibrary" className="h-4 w-4 accent-[var(--color-wine)]" />Also save to the Dish Library</label>
        </ActionDialog>
      </div>
    </div>
  );
}

function RecipeChecklist({ recipes }: { recipes: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const shown = recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">Recipes / components <span className="font-normal text-ink-4">(optional)</span></div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter recipes…" className="mb-2 h-9 text-sm" />
      <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-line p-1.5">
        {recipes.map((r) => (
          <label key={r.id} className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-sand/60", !shown.includes(r) && "hidden")}>
            <input type="checkbox" name="recipeIds" value={r.id} className="h-4 w-4 accent-[var(--color-wine)]" />
            {r.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function MenuItemRow({ item, guestCount, first, last }: { item: BuilderItem; guestCount: number; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  return (
    <div className={cn("group flex gap-3 px-4 py-3.5 sm:px-5", pending && "opacity-50")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-[1.2rem] leading-snug text-ink">{item.name}</span>
          {!item.inLibrary && <span className="text-[0.6875rem] uppercase tracking-wide text-ink-4">custom</span>}
        </div>
        {item.description && <div className="text-[0.8125rem] text-ink-3">{item.description}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span className={cn("tabular", item.guestCount && "font-medium text-wine")}>
            {item.guestCount ? `${item.guestCount} of ${guestCount} guests` : `All ${guestCount} guests`}
            {item.portionsPerGuest !== 1 && ` · ${item.portionsPerGuest}/guest`}
          </span>
          <span className="tabular">{formatMoney(item.costPerServingCents)} / plate</span>
          <span className="tabular font-medium text-ink-2">{formatMoney(item.totalCents)}</span>
          {item.componentCount === 0 && <span className="text-amber">No recipes linked — not in shopping or cost</span>}
          {item.allergens.length > 0 && <span className="text-ink-4">{item.allergens.join(" · ")}</span>}
        </div>
        {item.notes && <div className="mt-1 text-xs italic text-ink-2">{item.notes}</div>}
        {item.conflicts.length > 0 && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-clay-soft px-2.5 py-1 text-xs font-medium text-clay">
            <TriangleAlert className="h-3.5 w-3.5" />Check: {item.conflicts.join(", ")}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move up" disabled={first || pending} onClick={() => start(() => moveMenuItem(item.id, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move down" disabled={last || pending} onClick={() => start(() => moveMenuItem(item.id, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit portions" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove dish" disabled={pending} onClick={() => start(() => removeMenuItem(item.id))}><X className="h-4 w-4" /></Button>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)} title={item.name} description="Portions for this menu only.">
        <ActionForm action={updateMenuItem} hidden={{ itemId: item.id }} onCancel={() => setEditing(false)} onSuccess={() => setEditing(false)}>
          <FormGrid>
            <Field label="Serve to how many guests" name="guestCount" hint={`blank = all ${guestCount}`}>
              <Input id="guestCount" name="guestCount" type="number" min={1} defaultValue={item.guestCount ?? ""} placeholder={String(guestCount)} />
            </Field>
            <Field label="Portions per guest" name="portionsPerGuest" hint="e.g. 2 canapés">
              <Input id="portionsPerGuest" name="portionsPerGuest" inputMode="decimal" defaultValue={item.portionsPerGuest} />
            </Field>
          </FormGrid>
          <Field label="Notes" name="notes"><Textarea id="notes" name="notes" rows={2} defaultValue={item.notes ?? ""} placeholder="Sparkler on Ciara’s plate" /></Field>
        </ActionForm>
      </Dialog>
    </div>
  );
}

function DishPicker({
  open, onClose, library, courseName, onPick,
}: {
  open: boolean;
  onClose: () => void;
  library: LibraryDish[];
  courseName: string;
  onPick: (dishId: string) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [course, setCourse] = useState<string>("");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const courses = useMemo(() => [...new Set(library.map((d) => d.course))], [library]);
  const shown = library.filter(
    (d) =>
      (!course || d.course === course) &&
      (!q || `${d.name} ${d.description ?? ""} ${d.protein ?? ""} ${d.dietaryTags.join(" ")}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <Dialog open={open} onClose={() => { onClose(); setAdded([]); }} title={`Add to ${courseName}`} description="From the Prime Plates Dish Library" wide>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes, proteins, dietary…" className="pl-10" autoFocus />
      </div>
      <div className="scrollbar-none -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1">
        {["", ...courses].map((c) => (
          <button key={c || "all"} type="button" onClick={() => setCourse(c)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", course === c ? "border-espresso bg-espresso text-linen" : "border-line text-ink-2 hover:border-line-strong")}>
            {c ? COURSE[c] : "All"}
          </button>
        ))}
      </div>
      <div className="max-h-[55vh] space-y-1 overflow-y-auto">
        {shown.map((d) => {
          const isAdded = added.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              disabled={adding !== null}
              onClick={async () => {
                setAdding(d.id);
                await onPick(d.id);
                setAdded((a) => [...a, d.id]);
                setAdding(null);
              }}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sand/70", isAdded && "bg-sage-soft/60")}
            >
              <div className="min-w-0 flex-1">
                <div className="font-display text-[1.1rem] leading-tight">{d.name}</div>
                <div className="truncate text-xs text-ink-3">{COURSE[d.course]}{d.description ? ` · ${d.description}` : ""}</div>
                {d.dietaryTags.length > 0 && <div className="mt-0.5 text-[0.6875rem] text-sage">{d.dietaryTags.join(" · ")}</div>}
              </div>
              <div className="text-right text-xs">
                <div className="tabular font-medium text-ink">{formatMoney(d.costPerServingCents)}</div>
                <div className="text-ink-4">per plate</div>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-3">
                {adding === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdded ? "✓" : <Plus className="h-4 w-4" />}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="py-8 text-center text-sm text-ink-3">No dishes match.</p>}
      </div>
    </Dialog>
  );
}
