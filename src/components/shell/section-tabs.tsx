import { LinkTabs } from "@/components/ui/tabs";

/** Events & Clients: one section, four views. */
export function EventsClientsTabs({ active }: { active: "events" | "calendar" | "leads" | "clients" }) {
  return (
    <LinkTabs
      active={active}
      className="mb-5"
      tabs={[
        { key: "events", label: "Events", href: "/events" },
        { key: "calendar", label: "Calendar", href: "/calendar" },
        { key: "leads", label: "Leads", href: "/leads" },
        { key: "clients", label: "Clients", href: "/clients" },
      ]}
    />
  );
}
