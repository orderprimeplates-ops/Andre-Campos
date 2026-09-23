import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { DishFields } from "@/components/culinary/dish-fields";
import { createDish } from "../actions";

export const metadata = { title: "New dish" };

export default function NewDishPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Dish Library" title="New dish" description="Describe the plate — you’ll link its recipes on the next screen." />
      <Card><CardBody className="pt-6"><ActionForm action={createDish} submitLabel="Create & add components"><DishFields /></ActionForm></CardBody></Card>
    </div>
  );
}
