"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function ReviewButtons({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/users/${userId}/review`, "POST", { decision });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => decide("approve")}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          Approve
        </button>
        <button disabled={busy} onClick={() => decide("reject")} className={btnGhostCls}>
          Reject
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
