"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import { api, postForm } from "@/lib/client";
import { shrinkJpeg } from "@/lib/image-client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function ItemControls({
  id,
  isActive,
  ready,
  quantity,
  imageUrl,
}: {
  id: string;
  isActive: boolean;
  ready: boolean;
  quantity: number | null;
  imageUrl: string | null;
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

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await run(async () => {
      const out = new FormData();
      out.append("photo", await shrinkJpeg(file, 1000), "photo.jpg");
      await postForm(`/api/store/items/${id}/photo`, out);
    });
  }

  return (
    <div className="space-y-3">
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
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
        <input ref={input} type="file" accept="image/*" onChange={onPhoto} className="hidden" />
        <button disabled={busy} onClick={() => input.current?.click()} className={btnGhostCls}>
          {imageUrl ? "Change photo" : "Add photo"}
        </button>
        {imageUrl && (
          <button
            disabled={busy}
            onClick={() => run(() => api(`/api/store/items/${id}/photo`, "DELETE"))}
            className="rounded-full border border-bad/50 px-4 py-2 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
          >
            Remove photo
          </button>
        )}
      </div>
      {msg && <p className="text-xs text-bad">{msg}</p>}
    </div>
  );
}
