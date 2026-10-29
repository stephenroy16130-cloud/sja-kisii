"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function ItemControls({
  id,
  isActive,
  ready,
  quantity,
}: {
  id: string;
  isActive: boolean;
  ready: boolean;
  quantity: number | null;
}) {
  const router = useRouter();
  const [qty, setQty] = useState(String(quantity ?? 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function send(body: { isActive?: boolean; quantity?: number }) {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/store/items/${id}`, "PUT", body);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
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
      {msg && <span className="text-xs text-bad">{msg}</span>}
    </div>
  );
}
