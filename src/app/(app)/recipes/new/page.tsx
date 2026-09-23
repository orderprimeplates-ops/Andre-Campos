import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { RecipeFields } from "@/components/culinary/recipe-fields";
import { createRecipe } from "../actions";

export const metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Recipes" title="New recipe" description="Save the basics — you’ll add ingredients on the next screen." />
      <Card><CardBody className="pt-6"><ActionForm action={createRecipe} submitLabel="Create & add ingredients"><RecipeFields /></ActionForm></CardBody></Card>
    </div>
  );
}
