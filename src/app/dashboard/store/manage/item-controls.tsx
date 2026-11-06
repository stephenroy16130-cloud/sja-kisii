"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { api, postForm } from "@/lib/client";
import { shrinkJpeg } from "@/lib/image-client";
import { MAX_ITEM_PHOTOS } from "@/lib/shop-images";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function ItemControls({
  id,
  isActive,
  ready,
  quantity,
  images,
}: {
  id: string;
  isActive: boolean;
  ready: boolean;
  quantity: number | null;
  images: string[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [qty, setQty] = useState(String(quantity ?? 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  const send = (body: { isActive?: boolean; quantity?: number }) =>
    run(() => api(`/api/store/items/${id}`, "PUT", body));

  async function onPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_ITEM_PHOTOS - images.length;
    if (room <= 0) return setMsg(`An item can have up to ${MAX_ITEM_PHOTOS} photos`);
    await run(async () => {
      for (const file of files.slice(0, room)) {
        const out = new FormData();
        out.append("photo", await shrinkJpeg(file, 1000), "photo.jpg");
        await postForm(`/api/store/items/${id}/photo`, out);
      }
    });
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((src) => (
            <div key={src} className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                disabled={busy}
                aria-label="Remove photo"
                onClick={() => window.confirm("Remove this photo?") && run(() => api(`/api/store/items/${id}/photo`, "DELETE", { url: src }))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {ready && (
          <>
            <input
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={`${inputCls} !w-24 !py-2`}
              aria-label="Stock"
            />
            <button disabled={busy} onClick={() => send({ quantity: Number(qty) })} className={btnGhostCls}>
              Set stock
            </button>
          </>
        )}
        <button disabled={busy} onClick={() => send({ isActive: !isActive })} className={btnGhostCls}>
          {isActive ? "Hide" : "Show"}
        </button>
        <input ref={input} type="file" accept="image/*" multiple onChange={onPhotos} className="hidden" />
        {images.length < MAX_ITEM_PHOTOS && (
          <button disabled={busy} onClick={() => input.current?.click()} className={btnGhostCls}>
            {busy ? "Working..." : images.length ? "Add photos" : "Add photos"}
          </button>
        )}
        <span className="text-xs text-white/40">
          {images.length} of {MAX_ITEM_PHOTOS} photos
        </span>
      </div>
      {msg && <p className="text-xs text-bad">{msg}</p>}
    </div>
  );
}
