"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CSS = `
@keyframes pg-fade { from { opacity: 0 } to { opacity: 1 } }
.pg-fade { animation: pg-fade .18s ease-out }
@media (prefers-reduced-motion: reduce) { .pg-fade { animation: none } }
`;

const PEEK = 10; // how much of each photo behind the first one shows, in pixels

function Arrow({ left }: { left?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function Viewer({ images, alt, start, onClose }: { images: string[]; alt: string; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const scroller = useRef<HTMLDivElement>(null);
  const n = images.length;

  const go = useCallback(
    (i: number) => {
      const el = scroller.current;
      if (!el) return;
      const to = Math.max(0, Math.min(n - 1, i));
      el.scrollTo({ left: to * el.clientWidth, behavior: "smooth" });
    },
    [n]
  );

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, onClose]);

  return (
    <div
      className="pg-fade fixed inset-0 flex flex-col bg-black text-white"
      style={{ zIndex: 2147483100 }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="flex items-center px-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)" }}>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <Arrow left />
        </button>
        <p className="flex-1 text-center text-sm font-medium">{n > 1 ? `${index + 1} of ${n}` : ""}</p>
        <span className="h-10 w-10" />
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth > 0) setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((src, i) => (
            <div key={src + i} className="flex h-full min-w-full snap-center snap-always items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${alt}, photo ${i + 1} of ${n}`} draggable={false} className="max-w-full select-none object-contain" style={{ maxHeight: "100%" }} />
            </div>
          ))}
        </div>
        {n > 1 && index > 0 && (
          <button onClick={() => go(index - 1)} aria-label="Previous photo" className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid">
            <Arrow left />
          </button>
        )}
        {n > 1 && index < n - 1 && (
          <button onClick={() => go(index + 1)} aria-label="Next photo" className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 md:grid">
            <Arrow />
          </button>
        )}
      </div>

      <div className="px-4 pt-2 text-center" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)" }}>
        <p className="truncate text-xs text-white/60">{alt}</p>
        {n > 1 && (
          <div className="mt-2 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/30"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductGallery({ images, alt, className }: { images: string[]; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const list = images.filter(Boolean);
  if (list.length === 0) return null;
  const layers = Math.min(list.length, 3);

  return (
    <>
      <style>{CSS}</style>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View photos of ${alt}`}
        className={`relative block w-full text-left ${className ?? ""}`}
        style={{ paddingRight: (layers - 1) * PEEK }}
      >
        {/* The photos behind the first one, with a small strip showing */}
        {[1, 2].slice(0, layers - 1).map((k) => (
          <span
            key={k}
            aria-hidden="true"
            className="absolute overflow-hidden rounded-2xl border border-white/10 bg-neutral-900"
            style={{ top: k * 7, bottom: k * 7, left: k * PEEK, right: (layers - 1 - k) * PEEK, zIndex: 10 - k }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={list[k]} alt="" loading="lazy" className="h-full w-full object-cover" style={{ opacity: 1 - k * 0.25 }} />
          </span>
        ))}

        <span className="relative z-30 block aspect-square overflow-hidden rounded-2xl border border-white/15 bg-neutral-900 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={list[0]} alt={alt} loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent pb-3 pt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[11px] text-white backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
              Tap to view{list.length > 1 ? ` · ${list.length} photos` : ""}
            </span>
          </span>
        </span>
      </button>
      {open && typeof document !== "undefined" && createPortal(<Viewer images={list} alt={alt} start={0} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}
