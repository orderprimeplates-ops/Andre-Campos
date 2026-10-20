import {
  BookOpen,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Contact,
  Inbox,
  LayoutDashboard,
  LineChart,
  Package,
  Settings,
  ShoppingBasket,
  Sparkles,
  Users,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match?: string[];
}

/**
 * Five sections: Home, Events & Clients, Money, (Business Tasks — Phase 3) and More.
 * Every page that existed before is still here; only the grouping changed.
 */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Run the business",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/money", label: "Money", icon: LineChart, match: ["/financials"] },
    ],
  },
  {
    label: "Events & Clients",
    items: [
      { href: "/events", label: "Events", icon: Sparkles },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/leads", label: "Leads", icon: Inbox },
      { href: "/clients", label: "Clients", icon: Contact },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/dishes", label: "Menus & Dishes", icon: UtensilsCrossed },
      { href: "/recipes", label: "Recipes", icon: BookOpen },
      { href: "/ingredients", label: "Ingredients", icon: Wheat },
      { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
      { href: "/prep", label: "Prep", icon: ClipboardList },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/equipment", label: "Equipment", icon: Package },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Mobile bottom bar: Home · Events · [+ Add] · Money · More. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: ChefHat, match: ["/calendar", "/leads", "/clients"] },
  { href: "/money", label: "Money", icon: LineChart, match: ["/financials"] },
];

export function isActive(pathname: string, href: string, match: string[] = []) {
  if (href === "/") return pathname === "/";
  return [href, ...match].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}
