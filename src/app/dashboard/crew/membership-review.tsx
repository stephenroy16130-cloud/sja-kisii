"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function MembershipReview({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      await api(`/api/crew/membership/${id}/review`, "POST", { decision });
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
          className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50"
        >
          Approve
        </button>
        <button disabled={busy} onClick={() => decide("reject")} className={btnGhostCls}>
          Reject
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
