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

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Today",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/leads", label: "Leads", icon: Inbox },
      { href: "/clients", label: "Clients", icon: Contact },
      { href: "/events", label: "Events", icon: Sparkles },
    ],
  },
  {
    label: "Kitchen",
    items: [
      { href: "/dishes", label: "Menus & Dishes", icon: UtensilsCrossed },
      { href: "/recipes", label: "Recipes", icon: BookOpen },
      { href: "/ingredients", label: "Ingredients", icon: Wheat },
      { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
      { href: "/prep", label: "Prep", icon: ClipboardList },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/equipment", label: "Equipment", icon: Package },
      { href: "/financials", label: "Financials", icon: LineChart },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings };

/** Mobile bottom bar: what you reach for on your feet. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/events", label: "Events", icon: ChefHat },
  { href: "/shopping", label: "Shop", icon: ShoppingBasket },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
