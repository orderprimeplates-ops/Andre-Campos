"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

const MAX_EDGE = 1600;

/** Downsize a phone photo to a ~200–400 KB JPEG so it uploads quickly over cell service. */
async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

/** Optional receipt photo. Sends a downsized data URL in the hidden `receipt` field. */
export function ReceiptInput({ existingUrl }: { existingUrl?: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = dataUrl ?? (removed ? null : existingUrl ?? null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setDataUrl(await compress(file));
      setRemoved(false);
    } catch {
      setError("That photo couldn’t be read. Try a different one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">Receipt photo <span className="font-normal text-ink-4">optional</span></div>
      {dataUrl && <input type="hidden" name="receipt" value={dataUrl} />}
      {removed && !dataUrl && <input type="hidden" name="removeReceipt" value="true" />}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- private data URL / authenticated route */}
          <img src={preview} alt="Receipt" className="h-16 w-16 rounded-lg border border-line object-cover" />
          <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-medium text-wine">Replace</button>
          <button type="button" onClick={() => { setDataUrl(null); setRemoved(true); }} className="flex items-center gap-1 text-sm text-ink-3 hover:text-clay"><X className="h-3.5 w-3.5" />Remove</button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm text-ink-2 hover:bg-sand/60 disabled:opacity-60">
          <Camera className="h-4 w-4" />{busy ? "Preparing photo…" : "Add receipt photo"}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
