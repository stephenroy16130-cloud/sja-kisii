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
    <div className="text-right">
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => decide("approve")} className="bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50">Approve</button>
        <button disabled={busy} onClick={() => decide("reject")} className={btnGhostCls}>Reject</button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
