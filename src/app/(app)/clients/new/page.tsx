import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { ClientFields } from "@/components/clients/client-fields";
import { createClient } from "../actions";

export const metadata = { title: "New client" };

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Clients" title="New client" />
      <Card>
        <CardBody className="pt-6">
          <ActionForm action={createClient} submitLabel="Save client"><ClientFields /></ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
