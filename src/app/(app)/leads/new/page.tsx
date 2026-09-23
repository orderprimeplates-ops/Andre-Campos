import { db } from "@/lib/server/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { LeadFields } from "@/components/leads/lead-fields";
import { createLead } from "../actions";

export const metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const platforms = await db.platform.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Leads" title="New inquiry" description="Capture it now; details can be filled in as the conversation goes." />
      <Card>
        <CardBody className="pt-6">
          <ActionForm action={createLead} submitLabel="Save lead">
            <LeadFields platforms={platforms} />
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
