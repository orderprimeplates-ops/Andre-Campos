/**
 * Needs Attention: a rules engine that reads business data and decides what deserves your eyes
 * today. Each rule is small and readable; add a rule here and it appears on the Dashboard.
 *
 * Priorities are deliberately calm:
 *   urgent → something is overdue or happening within ~48 hours
 *   soon   → coming up this week; act when convenient
 *   info   → heads-up
 */

import { addDays, daysBetween, formatDate, relativeDay, type ISODate } from "./dates";
import { formatMoney } from "./money";

export type Priority = "urgent" | "soon" | "info";

export type AttentionKind =
  | "event-soon"
  | "final-count"
  | "menu-approval"
  | "menu-missing"
  | "deposit"
  | "balance"
  | "staffing"
  | "kitchen"
  | "shopping"
  | "prep"
  | "close-out"
  | "lead-follow-up"
  | "lead-new";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  priority: Priority;
  title: string;
  detail: string;
  href: string;
  date?: ISODate;
  subject: string; // client or lead name
}

export interface AttentionEvent {
  id: string;
  name: string;
  clientName: string;
  date: ISODate;
  status: string;
  guestCountConfirmed: boolean;
  finalCountDueDate?: ISODate | null;
  depositDueDate?: ISODate | null;
  balanceDueDate?: ISODate | null;
  shoppingDate?: ISODate | null;
  prepStartDate?: ISODate | null;
  menuStatus?: "DRAFT" | "SENT" | "APPROVED" | null;
  menuItemCount: number;
  depositOutstandingCents: number;
  balanceCents: number;
  openStaffRoles: number;
  unconfirmedStaff: number;
  kitchenMissingCritical: string[];
  hasVenue: boolean;
  isDropOff: boolean;
}

export interface AttentionLead {
  id: string;
  name: string;
  status: string;
  nextFollowUpDate?: ISODate | null;
  createdDate: ISODate;
  lastContacted: boolean;
  eventDate?: ISODate | null;
}

const ACTIVE = new Set(["TENTATIVE", "BOOKED", "PLANNING", "READY"]);
const RANK: Record<Priority, number> = { urgent: 0, soon: 1, info: 2 };

export function computeAttention(events: AttentionEvent[], leads: AttentionLead[], today: ISODate): AttentionItem[] {
  const out: AttentionItem[] = [];
  const push = (i: AttentionItem) => out.push(i);

  for (const e of events) {
    if (!ACTIVE.has(e.status)) continue;
    const until = daysBetween(today, e.date);
    const href = `/events/${e.id}`;
    const base = { subject: e.clientName };

    // Past events that haven't been closed out.
    if (until < 0) {
      if (e.balanceCents > 0) {
        push({ ...base, id: `${e.id}:balance`, kind: "balance", priority: "urgent", date: e.date,
          title: "Balance still outstanding", detail: `${formatMoney(e.balanceCents)} · ${e.name} was ${formatDate.short(e.date)}`,
          href: `${href}?tab=financials` });
      }
      push({ ...base, id: `${e.id}:close`, kind: "close-out", priority: "info", date: e.date,
        title: "Close out event", detail: `Enter actual costs & review · ${e.name}`, href: `${href}?tab=financials` });
      continue;
    }

    if (until <= 1) {
      push({ ...base, id: `${e.id}:soon`, kind: "event-soon", priority: until === 0 ? "urgent" : "soon", date: e.date,
        title: until === 0 ? "Event today" : "Event tomorrow", detail: e.name, href: `/events/${e.id}/live` });
    }

    if (!e.guestCountConfirmed && e.finalCountDueDate) {
      const d = daysBetween(today, e.finalCountDueDate);
      if (d < 0) push({ ...base, id: `${e.id}:count`, kind: "final-count", priority: "urgent", date: e.finalCountDueDate,
        title: "Final guest count overdue", detail: `Was due ${formatDate.short(e.finalCountDueDate)} · ${e.name}`, href });
      else if (d <= 3) push({ ...base, id: `${e.id}:count`, kind: "final-count", priority: "soon", date: e.finalCountDueDate,
        title: "Final guest count due", detail: `${relativeDay(e.finalCountDueDate, today)} · ${e.name}`, href });
    }

    if (e.menuItemCount === 0 && until <= 21) {
      push({ ...base, id: `${e.id}:menu`, kind: "menu-missing", priority: until <= 7 ? "urgent" : "soon", date: e.date,
        title: "Menu not started", detail: `${e.name} · ${relativeDay(e.date, today)}`, href: `${href}?tab=menu` });
    } else if (e.menuStatus === "SENT" && until <= 30) {
      push({ ...base, id: `${e.id}:menu`, kind: "menu-approval", priority: until <= 7 ? "urgent" : "soon", date: e.date,
        title: "Menu awaiting approval", detail: e.name, href: `${href}?tab=menu` });
    } else if (e.menuStatus === "DRAFT" && until <= 14) {
      push({ ...base, id: `${e.id}:menu`, kind: "menu-approval", priority: until <= 5 ? "urgent" : "soon", date: e.date,
        title: "Menu still in draft", detail: `Send to client · ${e.name}`, href: `${href}?tab=menu` });
    }

    if (e.depositOutstandingCents > 0) {
      const due = e.depositDueDate ?? today;
      const d = daysBetween(today, due);
      if (d <= 5) push({ ...base, id: `${e.id}:deposit`, kind: "deposit", priority: d < 0 ? "urgent" : "soon", date: due,
        title: d < 0 ? "Deposit overdue" : "Deposit outstanding",
        detail: `${formatMoney(e.depositOutstandingCents)} · ${e.name}`, href: `${href}?tab=financials` });
    } else if (e.balanceCents > 0) {
      const due = e.balanceDueDate ?? e.date;
      const d = daysBetween(today, due);
      if (d <= 5) push({ ...base, id: `${e.id}:balance`, kind: "balance", priority: d < 0 ? "urgent" : "soon", date: due,
        title: d < 0 ? "Balance overdue" : "Balance due",
        detail: `${formatMoney(e.balanceCents)} ${d < 0 ? "was due" : "due"} ${formatDate.short(due)} · ${e.name}`,
        href: `${href}?tab=financials` });
    }

    if ((e.openStaffRoles > 0 || e.unconfirmedStaff > 0) && until <= 14) {
      const parts = [];
      if (e.openStaffRoles) parts.push(`${e.openStaffRoles} open role${e.openStaffRoles > 1 ? "s" : ""}`);
      if (e.unconfirmedStaff) parts.push(`${e.unconfirmedStaff} unconfirmed`);
      push({ ...base, id: `${e.id}:staff`, kind: "staffing", priority: until <= 3 ? "urgent" : "soon", date: e.date,
        title: "Staffing incomplete", detail: `${parts.join(", ")} · ${e.name}`, href: `${href}?tab=staff` });
    }

    if (!e.isDropOff && until <= 10 && (!e.hasVenue || e.kitchenMissingCritical.length > 0)) {
      push({ ...base, id: `${e.id}:kitchen`, kind: "kitchen", priority: until <= 3 ? "urgent" : "soon", date: e.date,
        title: "Kitchen information missing",
        detail: e.hasVenue ? `${e.kitchenMissingCritical.slice(0, 3).join(", ")} · ${e.name}` : `No venue set · ${e.name}`,
        href: `${href}?tab=venue` });
    }

    if (e.shoppingDate) {
      const d = daysBetween(today, e.shoppingDate);
      if (d === 0 || d === 1) push({ ...base, id: `${e.id}:shop`, kind: "shopping", priority: d === 0 ? "soon" : "info",
        date: e.shoppingDate, title: d === 0 ? "Shopping today" : "Shopping tomorrow", detail: e.name, href: `/events/${e.id}/shop` });
    }

    if (e.prepStartDate) {
      const d = daysBetween(today, e.prepStartDate);
      if (d === 0 || d === 1) push({ ...base, id: `${e.id}:prep`, kind: "prep", priority: d === 0 ? "soon" : "info",
        date: e.prepStartDate, title: d === 0 ? "Prep begins today" : "Prep begins tomorrow", detail: e.name,
        href: `${href}?tab=prep` });
    }
  }

  for (const l of leads) {
    if (l.status === "BOOKED" || l.status === "LOST") continue;
    const href = `/leads/${l.id}`;
    if (l.status === "NEW" && !l.lastContacted) {
      const age = daysBetween(l.createdDate, today);
      push({ id: `${l.id}:new`, kind: "lead-new", priority: age >= 1 ? "urgent" : "soon", subject: l.name, href,
        date: l.createdDate, title: "New inquiry awaiting reply",
        detail: l.eventDate ? `For ${formatDate.short(l.eventDate)}` : `Received ${relativeDay(l.createdDate, today)}` });
      continue;
    }
    if (l.nextFollowUpDate && daysBetween(today, l.nextFollowUpDate) <= 0) {
      const late = -daysBetween(today, l.nextFollowUpDate);
      push({ id: `${l.id}:follow`, kind: "lead-follow-up", priority: late >= 3 ? "urgent" : "soon", subject: l.name, href,
        date: l.nextFollowUpDate, title: "Lead needs follow-up",
        detail: late === 0 ? "Follow-up scheduled today" : `Follow-up was ${formatDate.short(l.nextFollowUpDate)}` });
    }
  }

  return out.sort((a, b) => RANK[a.priority] - RANK[b.priority] || (a.date ?? "").localeCompare(b.date ?? ""));
}

/** Upper bound of the window the attention engine looks at, useful for query filters. */
export function attentionWindowEnd(today: ISODate): ISODate {
  return addDays(today, 31);
}
