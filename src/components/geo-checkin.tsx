"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { announceFirstCheckIn } from "@/components/toast";
import { api } from "@/lib/client";
import { getPosition, locationErrorMessage } from "@/lib/geo-client";

export default function GeoCheckin({ kind, id }: { kind: "meeting" | "fieldop" | "training"; id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    setMsg("Getting your location...");
    try {
      const p = await getPosition();
      setMsg("Checking you in...");
      const r = await api("/api/checkin", "POST", { kind, id, lat: p.lat, lng: p.lng, accuracy: p.accuracy });
      announceFirstCheckIn(r);
      setMsg(r.status === "CONFIRMED" ? "You are checked in." : "Check-in received. Pending verification.");
      router.refresh();
    } catch (e) {
      setMsg("");
      setError(locationErrorMessage(e));
    }
    setBusy(false);
  }

  return (
    <div>
      <button
        disabled={busy}
        onClick={go}
        className="rounded-full bg-ok px-6 py-3 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Please wait..." : "Check in here"}
      </button>
      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
