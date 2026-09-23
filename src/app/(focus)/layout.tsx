import { requireUser } from "@/lib/server/auth";

/** Full-screen layouts without navigation: Day-of mode and the printable client menu. */
export default async function FocusLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return <div className="min-h-dvh">{children}</div>;
}
