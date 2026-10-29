"use client";

import type { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "pay" | "fulfil" | "cancel") {
    if (action === "cancel" && !confirm("Cancel this order?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/store/orders/${orderId}/status`, "POST", {
        action,
        ...(action === "pay" ? { receipt } : {}),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  if (status === "CANCELLED" || status === "FULFILLED") return null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING_PAYMENT" && (
          <>
            <input
              value={receipt}
              onChange={(e) => setReceipt(e.target.value.toUpperCase())}
              placeholder="M-Pesa code"
              maxLength={12}
              className={`${inputCls} !w-40 !py-2 font-mono`}
            />
            <button
              disabled={busy || receipt.length < 8}
              onClick={() => act("pay")}
              className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-40"
            >
              Mark paid
            </button>
          </>
        )}
        {status === "PAID" && (
          <button
            disabled={busy}
            onClick={() => act("fulfil")}
            className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-40"
          >
            Mark collected
          </button>
        )}
        <button disabled={busy} onClick={() => act("cancel")} className={btnGhostCls}>
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
