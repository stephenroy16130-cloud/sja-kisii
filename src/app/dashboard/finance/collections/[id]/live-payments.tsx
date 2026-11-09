"use client";

import { useEffect, useRef, useState } from "react";
import { crewColor, crewName } from "@/lib/crews";
import type { CollectionLive } from "@/lib/collections";

const kes = (n: number) => "KES " + n.toLocaleString("en-KE");
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

export default function LivePayments({ id, initial }: { id: string; initial: CollectionLive }) {
  const [data, setData] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef(new Set(initial.payments.map((p) => p.id)));

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/collections/${id}/payments`, { cache: "no-store" });
        if (!r.ok || stopped) return;
        const j = (await r.json()) as CollectionLive;
        const added = j.payments.filter((p) => !seen.current.has(p.id)).map((p) => p.id);
        added.forEach((a) => seen.current.add(a));
        setData(j);
        if (added.length) {
          setFresh(new Set(added));
          setTimeout(() => setFresh(new Set()), 4000);
        }
      } catch {
        // try again on the next tick
      }
    }
    const timer = setInterval(tick, 5000);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
        Live. This list updates by itself every few seconds.
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-2xl font-light text-gold">{kes(data.total)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Collected</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-2xl font-light text-ok">
            {data.count} <span className="text-sm text-white/40">of {data.eligible}</span>
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Have paid</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className={`text-2xl font-light ${data.pending ? "text-warn" : ""}`}>{data.pending}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Paying now</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-2xl font-light">{Math.max(0, data.eligible - data.count)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Still to pay</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-light">Payments ({data.count})</h2>
        {data.payments.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            No payments yet. They appear here the moment they come in.
          </div>
        ) : (
          <div className="space-y-2">
            {data.payments.map((p) => (
              <div
                key={p.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors duration-700 ${
                  fresh.has(p.id) ? "border-ok" : "border-white/10"
                }`}
              >
                <div>
                  <p className="text-sm uppercase tracking-wide">{p.name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-white/40">
                    {p.crewId && (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: crewColor(p.crewId) }} />
                        {crewName(p.crewId)} ·{" "}
                      </>
                    )}
                    {time(p.at)}
                    {p.receipt ? ` · ${p.receipt}` : ""}
                  </p>
                </div>
                <span className="text-gold">{kes(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.unpaid.length > 0 && (
        <details className="text-sm text-white/60">
          <summary className="cursor-pointer hover:text-white">Who has not paid ({Math.max(0, data.eligible - data.count)})</summary>
          <ul className="mt-2 space-y-1 uppercase tracking-wide">
            {data.unpaid.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
