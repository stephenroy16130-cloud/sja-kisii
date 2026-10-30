"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function ReturnActions({ logId }: { logId: string }) {
  const router = useRouter();
  const [condition, setCondition] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function close(outcome: "RETURNED" | "DAMAGED" | "LOST") {
    if (outcome === "LOST" && !confirm("Mark this instrument as lost?")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/band/logs/${logId}/return`, "POST", {
        outcome,
        ...(condition.trim() ? { condition: condition.trim() } : {}),
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Condition on return (optional)"
          maxLength={100}
          className={`${inputCls} !w-64 !py-2`}
        />
        <button
          disabled={busy}
          onClick={() => close("RETURNED")}
          className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50"
        >
          Returned
        </button>
        <button disabled={busy} onClick={() => close("DAMAGED")} className={btnGhostCls}>
          Damaged
        </button>
        <button
          disabled={busy}
          onClick={() => close("LOST")}
          className="rounded-full border border-bad/50 px-5 py-2.5 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
        >
          Lost
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
