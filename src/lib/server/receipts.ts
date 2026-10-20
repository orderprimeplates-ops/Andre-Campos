import "server-only";
import { form, FormError } from "./forms";

const MAX_RECEIPT_BYTES = 2_500_000;

/** The phone downsizes the photo and sends it as a data URL; decode and sanity-check it here. */
export function parseReceipt(fd: FormData): { mimeType: string; data: Uint8Array<ArrayBuffer> } | null {
  const raw = form.str(fd, "receipt");
  if (!raw) return null;
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!m) throw new FormError("That receipt photo couldn’t be read — try another photo.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.byteLength > MAX_RECEIPT_BYTES) throw new FormError("That receipt photo is too large.");
  return { mimeType: m[1], data: new Uint8Array(buf) };
}
