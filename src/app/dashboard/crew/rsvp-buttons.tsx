"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type R = "GOING" | "MAYBE" | "NOT_GOING";
const OPTS: { v: R; label: string; on: string }[] = [
  { v: "GOING", label: "Going", on: "bg-ok text-black" },
  { v: "MAYBE", label: "Maybe", on: "bg-warn text-black" },
  { v: "NOT_GOING", label: "Can't go", on: "bg-bad text-black" },
];

export default function RsvpButtons({ announcementId, current }: { announcementId: string; current: R | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(v: R) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/crew/announcements/${announcementId}/rsvp`, "POST", { response: v });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="inline-flex overflow-hidden rounded-full border border-white/20 text-xs">
        {OPTS.map((o) => (
          <button
            key={o.v}
            disabled={busy}
            onClick={() => pick(o.v)}
            className={`px-4 py-2 transition disabled:opacity-60 ${
              current === o.v ? o.on : "text-white/60 hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
