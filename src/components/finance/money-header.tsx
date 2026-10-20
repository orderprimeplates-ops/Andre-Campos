import { PageHeader } from "@/components/ui/page-header";
import { LinkTabs } from "@/components/ui/tabs";

export const BASIS_LEGEND = [
  { label: "Actual", tone: "bg-sage", text: "from real payments and recorded costs" },
  { label: "Estimated", tone: "bg-amber", text: "filled in where costs are missing (e.g. 70% historical margin)" },
  { label: "Projected", tone: "bg-slate", text: "what’s booked or planned, not yet happened" },
];

export function MoneyHeader({ tab }: { tab: "overview" | "bookkeeping" }) {
  return (
    <div>
      <PageHeader eyebrow="Business" title="Money" description="What’s coming in, what’s going out, and what’s really yours." />
      <LinkTabs
        active={tab}
        className="mt-4"
        tabs={[
          { key: "overview", label: "Overview", href: "/money" },
          { key: "bookkeeping", label: "Bookkeeping", href: "/money?tab=bookkeeping" },
        ]}
      />
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-3">
        {BASIS_LEGEND.map((b) => (
          <span key={b.label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${b.tone}`} /><strong className="font-medium text-ink-2">{b.label}</strong> {b.text}</span>
        ))}
      </div>
    </div>
  );
}
