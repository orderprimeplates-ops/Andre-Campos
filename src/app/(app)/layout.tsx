import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileTabBar, MobileTopBar } from "@/components/shell/mobile-nav";
import { SearchPalette } from "@/components/shell/search-palette";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const newLeads = await db.lead.count({ where: { status: "NEW" } });
  const badges = { "/leads": newLeads };

  return (
    <div className="min-h-dvh">
      <Sidebar userName={user.name} badges={badges} />
      <MobileTopBar />
      <main className="lg:pl-[264px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-9">{children}</div>
      </main>
      <MobileTabBar badges={badges} />
      <SearchPalette />
    </div>
  );
}
