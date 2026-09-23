import "server-only";
import { parseMoney } from "@/lib/domain/money";
import { fromISODate } from "@/lib/domain/dates";

/** Result every form action returns to its client form. */
export type ActionState = { ok?: boolean; error?: string; message?: string; id?: string } | undefined;

/** Small, forgiving readers for FormData. Blank → null. */
export const form = {
  str(fd: FormData, key: string): string | null {
    const v = fd.get(key);
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t === "" ? null : t;
  },
  req(fd: FormData, key: string, label = key): string {
    const v = form.str(fd, key);
    if (!v) throw new FormError(`${label} is required.`);
    return v;
  },
  int(fd: FormData, key: string): number | null {
    const v = form.str(fd, key);
    if (v === null) return null;
    const n = Math.round(Number(v.replace(/,/g, "")));
    return Number.isFinite(n) ? n : null;
  },
  num(fd: FormData, key: string): number | null {
    const v = form.str(fd, key);
    if (v === null) return null;
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  },
  money(fd: FormData, key: string): number | null {
    return parseMoney(form.str(fd, key));
  },
  date(fd: FormData, key: string): Date | null {
    const v = form.str(fd, key);
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    return fromISODate(v);
  },
  time(fd: FormData, key: string): string | null {
    const v = form.str(fd, key);
    return v && /^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, "0") : null;
  },
  bool(fd: FormData, key: string): boolean {
    const v = fd.get(key);
    return v === "on" || v === "true" || v === "1" || v === "yes";
  },
  /** yes / no / "" (unknown) radio groups */
  tri(fd: FormData, key: string): boolean | null {
    const v = fd.get(key);
    return v === "yes" ? true : v === "no" ? false : null;
  },
  list(fd: FormData, key: string): string[] {
    return fd.getAll(key).filter((v): v is string => typeof v === "string" && v.trim() !== "").map((v) => v.trim());
  },
  /** Comma-separated tags → array */
  tags(fd: FormData, key: string): string[] {
    const v = form.str(fd, key);
    return v ? [...new Set(v.split(",").map((s) => s.trim()).filter(Boolean))] : [];
  },
  /** Pass a Prisma enum object (e.g. `EventType`) or a list of allowed values. */
  enumOf<T extends string>(fd: FormData, key: string, allowed: readonly T[] | Record<string, T>): T | null {
    const v = form.str(fd, key);
    const list: readonly string[] = Array.isArray(allowed) ? allowed : Object.values(allowed);
    return v && list.includes(v) ? (v as T) : null;
  },
};

export class FormError extends Error {}

/** Wraps an action body: turns validation errors into friendly messages. */
export async function attempt(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    // redirect() and notFound() work by throwing — let them through.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { error: "Something went wrong saving that. Please try again." };
  }
}
