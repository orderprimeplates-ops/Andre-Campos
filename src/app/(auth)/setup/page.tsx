import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { BrandMark } from "@/components/shell/brand";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Welcome" };

/** Only reachable while the database has no accounts at all. */
export default async function SetupPage() {
  if ((await db.user.count()) > 0) redirect("/login");
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-fade-up">
        <BrandMark className="mb-8 h-11 w-11" />
        <div className="eyebrow mb-2">Welcome to Prime Plates HQ</div>
        <h1 className="font-display text-4xl leading-tight">Let’s set up your kitchen.</h1>
        <p className="mb-8 mt-2 text-ink-3">
          Create your owner account. This page only appears once — after this, it’s locked and everyone signs in normally.
        </p>
        <SetupForm />
        <p className="mt-6 text-xs text-ink-4">Your stores and booking platforms are added for you, ready to edit in Settings.</p>
      </div>
    </div>
  );
}
