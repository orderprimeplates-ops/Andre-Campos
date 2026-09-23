import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { BrandMark } from "@/components/shell/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-espresso lg:block">
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#f7f3ec_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full border border-champagne/20" />
        <div className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full border border-champagne/25" />
        <div className="relative flex h-full flex-col justify-between p-14 text-linen">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="font-display text-2xl">Prime Plates</span>
          </div>
          <div className="max-w-md">
            <p className="font-display text-[2.75rem] italic leading-[1.1] text-linen/95">
              Every plate, every guest, every detail — in one place.
            </p>
            <p className="mt-5 text-sm uppercase tracking-[0.28em] text-champagne">Private Chef &amp; Catering</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10 lg:hidden">
            <BrandMark className="h-11 w-11" />
          </div>
          <div className="eyebrow mb-2">Prime Plates HQ</div>
          <h1 className="font-display text-4xl leading-tight">Welcome back, Chef.</h1>
          <p className="mb-8 mt-2 text-ink-3">Sign in to run the kitchen.</p>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
    </div>
  );
}
