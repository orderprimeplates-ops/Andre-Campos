"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { assignVenue } from "@/app/(app)/events/actions/venue";

export function VenuePicker({ eventId, venueId, venues }: { eventId: string; venueId: string | null; venues: { id: string; name: string; group: string }[] }) {
  const [pending, start] = useTransition();
  const groups = [...new Set(venues.map((v) => v.group))];
  return (
    <div className="relative flex items-center gap-2">
      <select
        aria-label="Venue"
        value={venueId ?? ""}
        disabled={pending}
        onChange={(e) => start(() => assignVenue(eventId, e.target.value || null))}
        className="h-10 w-full appearance-none rounded-xl border border-line-strong/60 bg-white/70 px-3.5 pr-9 text-sm focus:border-wine/50 focus:outline-none focus:ring-4 focus:ring-wine/10"
      >
        <option value="">No venue</option>
        {groups.map((g) => (
          <optgroup key={g} label={g}>
            {venues.filter((v) => v.group === g).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </optgroup>
        ))}
      </select>
      {pending && <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-ink-3" />}
    </div>
  );
}
