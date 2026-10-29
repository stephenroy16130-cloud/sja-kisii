"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!confirm("Cancel this order?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/store/orders/${orderId}/status`, "POST", { action: "cancel" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div>
      <button disabled={busy} onClick={cancel} className={btnGhostCls}>
        {busy ? "Cancelling..." : "Cancel order"}
      </button>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
