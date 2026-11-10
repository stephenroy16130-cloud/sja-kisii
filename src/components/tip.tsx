"use client";

import { useEffect, useState } from "react";
import type { TipDef } from "@/lib/tips";

// A small, dismissible coach-mark. Shown once per person per page, remembered in local storage.
export default function Tip({ id, title, text, target, userId }: TipDef & { userId: string }) {
  const key = `hasSeen${id}Tooltip:${userId}`;
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(key) === "1";
    } catch {
      // storage can be blocked: the tip then simply shows each time
    }
    if (seen) return;
    const t = setTimeout(() => setShow(true), 900);
    return () => clearTimeout(t);
  }, [key]);

  // Draw a gold ring around the main feature, if the page has it
  useEffect(() => {
    if (!show || !target) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(target);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    document.querySelector(target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    const timer = setInterval(measure, 800);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [show, target]);

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <>
      {rect && (
        <div
          className="pointer-events-none fixed z-40 animate-pulse rounded-2xl ring-2 ring-gold"
          style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        role="status"
        className="fixed inset-x-4 bottom-28 z-40 mx-auto max-w-sm rounded-2xl border border-gold/50 bg-card p-4 shadow-2xl lg:bottom-20 lg:left-6 lg:right-auto lg:mx-0"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Tip</p>
            <p className="mt-1 text-sm font-medium">{title}</p>
          </div>
          <button onClick={dismiss} aria-label="Close tip" className="text-xl leading-none text-white/40 hover:text-white">
            ×
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-white/70">
          {text}
          {rect ? " Look for the gold outline." : ""}
        </p>
        <button
          onClick={dismiss}
          className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-neutral-200"
        >
          Got it
        </button>
      </div>
    </>
  );
}
