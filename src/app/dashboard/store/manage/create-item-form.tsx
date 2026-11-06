"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import MultiPhotoPicker from "@/components/multi-photo-picker";
import { api, postForm } from "@/lib/client";
import { shrinkJpeg } from "@/lib/image-client";
import { MAX_ITEM_PHOTOS } from "@/lib/shop-images";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function CreateItemForm() {
  const router = useRouter();
  const [mto, setMto] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const description = String(f.get("description") || "").trim();
    const opens = String(f.get("opens") || "");
    const closes = String(f.get("closes") || "");
    const sizes = String(f.get("sizes") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const created = await api("/api/store/items", "POST", {
        name: f.get("name"),
        price: Number(f.get("price")),
        stockType: mto ? "MADE_TO_ORDER" : "READY_STOCK",
        ...(description ? { description } : {}),
        ...(mto
          ? {
              sizes,
              ...(opens ? { orderOpensAt: new Date(opens).toISOString() } : {}),
              ...(closes ? { orderClosesAt: new Date(closes).toISOString() } : {}),
            }
          : { quantity: Number(f.get("quantity")) }),
      });

      let failed = 0;
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}...`);
        try {
          const out = new FormData();
          out.append("photo", await shrinkJpeg(photos[i], 1000), "photo.jpg");
          await postForm(`/api/store/items/${created.id}/photo`, out);
        } catch {
          failed++;
        }
      }
      setStatus("");
      if (failed) setError(`The item was created, but ${failed} photo(s) failed. Add them from the item list below.`);
      else setMsg("Item created");
      form.reset();
      setPhotos([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setStatus("");
    setBusy(false);
  }

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-xs transition ${
      active ? "border-white bg-white text-black" : "border-white/20 text-white/60 hover:border-white/50"
    }`;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>Type</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMto(false)} className={pill(!mto)}>Ready stock</button>
          <button type="button" onClick={() => setMto(true)} className={pill(mto)}>Made to order</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>Name</label>
        <input name="name" required className={inputCls} placeholder="Division polo shirt" />
      </div>
      <div>
        <label className={labelCls}>Price (KES)</label>
        <input name="price" type="number" step="1" min="1" required className={inputCls} />
      </div>
      {!mto ? (
        <div>
          <label className={labelCls}>In stock</label>
          <input name="quantity" type="number" min="0" required className={inputCls} />
        </div>
      ) : (
        <>
          <div className="sm:col-span-2">
            <label className={labelCls}>Sizes (comma separated, optional)</label>
            <input name="sizes" className={inputCls} placeholder="S, M, L, XL" />
          </div>
          <div>
            <label className={labelCls}>Orders open</label>
            <input name="opens" type="datetime-local" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Orders close</label>
            <input name="closes" type="datetime-local" className={inputCls} />
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls}>Photos (optional, up to {MAX_ITEM_PHOTOS})</label>
        <MultiPhotoPicker files={photos} onChange={setPhotos} max={MAX_ITEM_PHOTOS} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Description (optional)</label>
        <textarea name="description" rows={2} className={inputCls} />
      </div>
      {busy && status && <p className="text-sm text-gold sm:col-span-2">{status}</p>}
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Please wait..." : "Create item"}</button>
      </div>
    </form>
  );
}
