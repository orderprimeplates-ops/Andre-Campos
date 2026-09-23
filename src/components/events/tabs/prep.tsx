import type { getEventWorkspace } from "@/lib/server/workspace";
import { db } from "@/lib/server/db";
import { addDays, toISODate } from "@/lib/domain/dates";
import { PREP_PHASES } from "@/lib/domain/planning";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PrepBoard } from "@/components/prep/prep-board";
import { RunOfShowEditor } from "@/components/prep/run-of-show-editor";

type WS = NonNullable<Awaited<ReturnType<typeof getEventWorkspace>>>;

export async function PrepTab({ ws }: { ws: WS }) {
  const { event: e } = ws;
  const staff = await db.staffMember.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const date = toISODate(e.date);
  const phaseDates = Object.fromEntries(PREP_PHASES.map((p) => [p.key, p.offsetDays === null ? null : addDays(date, p.offsetDays)]));
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_30rem]">
      <div className="min-w-0">
        <PrepBoard
          eventId={e.id}
          staff={staff}
          phaseDates={phaseDates}
          tasks={e.prepTasks.map((t) => ({
            id: t.id, title: t.title, phase: t.phase, status: t.status, estimatedMinutes: t.estimatedMinutes,
            assigneeId: t.assigneeId, assigneeName: t.assignee?.name ?? null, recipeId: t.recipeId, recipeName: t.recipe?.name ?? null, notes: t.notes,
          }))}
        />
      </div>
      <Card className="h-fit">
        <CardHeader eyebrow="Day-of" title="Timeline" />
        <CardBody>
          <RunOfShowEditor eventId={e.id} items={e.runOfShow.map((r) => ({ id: r.id, time: r.time, title: r.title, kind: r.kind, details: r.details }))} />
        </CardBody>
      </Card>
    </div>
  );
}
