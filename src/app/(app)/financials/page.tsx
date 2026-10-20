import { redirect } from "next/navigation";

/** Financials now lives in Money → Overview. Old links and bookmarks keep working. */
export default async function FinancialsRedirect({ searchParams }: PageProps<"/financials">) {
  const sp = await searchParams;
  const qs = new URLSearchParams(Object.entries(sp).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v ? [[k, v]] : [])));
  redirect(`/money${qs.size ? `?${qs}` : ""}`);
}
