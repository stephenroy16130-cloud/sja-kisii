"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { showToast } from "./toast";

type Poll = { unread: number; latest: { id: string; title: string; body: string } | null };

export default function Bell() {
  const [n, setN] = useState(0);
  // undefined until the first check, so existing items do not pop up when the page opens
  const seen = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!r.ok || stopped) return;
        const j = (await r.json()) as Poll;
        setN(j.unread);
        const id = j.latest?.id ?? null;
        if (seen.current !== undefined && id && id !== seen.current && j.latest) {
          showToast(j.latest.title, j.latest.body);
        }
        seen.current = id;
      } catch {
        // try again on the next tick
      }
    }
    void tick();
    const timer = setInterval(tick, 20_000);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    const onRead = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("sja-notifications", onRead);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("sja-notifications", onRead);
    };
  }, []);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={n > 0 ? `Notifications, ${n} unread` : "Notifications"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white hover:text-black"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {n > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-bad px-1 text-center text-[10px] font-semibold leading-[18px] text-black">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
