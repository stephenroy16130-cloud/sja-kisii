"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

type Row = { userId: string; name: string; crew: string; at: string };

export default function CheckinReview({ kind, eventId, rows }: { kind: string; eventId: string; rows: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/qr/${kind}/${eventId}/verify`, "POST", body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  const green =
    "rounded-full bg-ok px-4 py-2 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50";

  return (
    <div>
      <button disabled={busy} onClick={() => send({ all: "confirm" })} className={`${green} mb-3`}>
        Confirm all ({rows.length})
      </button>
      <div className="divide-y divide-white/10">
        {rows.map((r) => (
          <div key={r.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm uppercase tracking-wide">{r.name}</p>
              <p className="mt-0.5 text-xs text-white/40">{r.crew} · scanned {r.at}</p>
            </div>
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => send({ decisions: [{ userId: r.userId, decision: "confirm" }] })}
                className={green}
              >
                Confirm
              </button>
              <button
                disabled={busy}
                onClick={() => send({ decisions: [{ userId: r.userId, decision: "reject" }] })}
                className={btnGhostCls}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}
