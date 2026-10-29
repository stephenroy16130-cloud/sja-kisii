"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { kes } from "@/lib/store";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function OrderForm({
  itemId,
  price,
  sizes,
  madeToOrder,
  maxQty,
}: {
  itemId: string;
  price: number;
  sizes: string[];
  madeToOrder: boolean;
  maxQty: number | null;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const limit = Math.min(20, maxQty ?? 20);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const size = String(f.get("size") || "");
    const notes = String(f.get("notes") || "").trim();
    try {
      const res = await api("/api/store/orders", "POST", {
        itemId,
        quantity: qty,
        ...(size ? { size } : {}),
        ...(notes ? { notes } : {}),
      });
      setMsg(`Order placed: ${kes(res.total)}. See My orders below.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3 border-t border-white/10 pt-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Quantity</label>
          <input
            type="number"
            min={1}
            max={limit}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(limit, Number(e.target.value) || 1)))}
            className={inputCls}
          />
        </div>
        {sizes.length > 0 && (
          <div>
            <label className={labelCls}>Size</label>
            <select name="size" required defaultValue="" className={inputCls}>
              <option value="" disabled>Choose</option>
              {sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {madeToOrder && (
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <input name="notes" className={inputCls} placeholder="Name to print, special request" />
        </div>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {msg && <p className="text-sm text-ok">{msg}</p>}
      <button disabled={busy} className={btnCls}>
        {busy ? "Placing order..." : `Order · ${kes(price * qty)}`}
      </button>
    </form>
  );
}
