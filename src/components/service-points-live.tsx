"use client";

import { useEffect, useRef, useState } from "react";
import type { ServicePointsData } from "@/lib/service-points";

// Counts smoothly from the number on screen to the new one
function useCountUp(target: number) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
      setShown(v);
      from.current = v;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

export default function ServicePointsLive({ initial }: { initial: ServicePointsData }) {
  const [data, setData] = useState(initial);
  const [gain, setGain] = useState(0);
  const last = useRef(initial.total);
  const shown = useCountUp(data.total);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/me/points", { cache: "no-store" });
        if (!r.ok || stopped) return;
        const j = (await r.json()) as ServicePointsData;
        if (j.total > last.current) {
          setGain(j.total - last.current);
          setTimeout(() => setGain(0), 5000);
        }
        last.current = j.total;
        setData(j);
      } catch {
        // try again on the next tick
      }
    }
    const timer = setInterval(tick, 30_000);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const parts = [
    { label: "Meetings", v: data.meetings },
    { label: "Field ops", v: data.fieldOps },
    { label: "Training", v: data.training },
    ...(data.band > 0 ? [{ label: "Band", v: data.band }] : []),
  ];

  return (
    <section className="rounded-3xl border border-gold/30 bg-card p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Points in service</p>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-white/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          Live
        </span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <p className="text-6xl font-light tabular-nums text-gold md:text-7xl">{shown.toLocaleString("en-KE")}</p>
        {gain > 0 && <p className="mb-2 text-lg text-ok">+{gain}</p>}
      </div>
      <p className="mt-1 text-xs text-white/40">All time, since you joined. Every event you attend adds to it.</p>
      <div className={`mt-5 grid gap-3 ${parts.length === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"}`}>
        {parts.map((p) => (
          <div key={p.label} className="rounded-2xl bg-white/5 p-3 text-center">
            <p className="text-xl font-light tabular-nums">{p.v.toLocaleString("en-KE")}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/40">{p.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
