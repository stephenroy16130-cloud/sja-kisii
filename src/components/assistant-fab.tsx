"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";

const SIZE = 56;
const MARGIN = 8;
const POS_KEY = "sja-fab-pos";
const HINT_KEY = "sja-fab-hint";

// The position is kept as a share of the free space, so it still makes sense when the phone turns
type Pos = { fx: number; fy: number };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function AssistantFab({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [pos, setPos] = useState<Pos | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const posRef = useRef<Pos | null>(null);
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  useEffect(() => {
    const measure = () => setView({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);

    let saved: Pos | null = null;
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Pos>;
        if (typeof p.fx === "number" && typeof p.fy === "number") saved = { fx: clamp(p.fx, 0, 1), fy: clamp(p.fy, 0, 1) };
      }
    } catch {
      // no saved position
    }
    // First time: bottom right, above the bottom bar (on desktop, clear the 288px sidebar)
    const areaH = Math.max(1, window.innerHeight - SIZE - MARGIN * 2);
    const areaW = Math.max(1, window.innerWidth - SIZE - MARGIN * 2);
    const isDesktop = window.innerWidth >= 1024;
    const defaultX = isDesktop ? Math.max(MARGIN, window.innerWidth - 288 - SIZE - 20) : window.innerWidth - SIZE - MARGIN;
    const initial = saved ?? {
      fx: clamp((defaultX - MARGIN) / areaW, 0, 1),
      fy: clamp((window.innerHeight - SIZE - 100 - MARGIN) / areaH, 0, 1),
    };
    posRef.current = initial;
    setPos(initial);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!localStorage.getItem(HINT_KEY)) {
        setHint(true);
        timer = setTimeout(() => {
          setHint(false);
          try {
            localStorage.setItem(HINT_KEY, "1");
          } catch {
            // ignore
          }
        }, 5500);
      }
    } catch {
      // ignore
    }
    return () => {
      window.removeEventListener("resize", measure);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!enabled || !pos || path.startsWith("/dashboard/assistant")) return null;

  const aw = Math.max(0, view.w - SIZE - MARGIN * 2);
  const ah = Math.max(0, view.h - SIZE - MARGIN * 2);
  const x = MARGIN + pos.fx * aw;
  const y = MARGIN + pos.fy * ah;
  const open = () => router.push("/dashboard/assistant");

  function down(e: RPointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: x, oy: y, moved: false };
  }
  function move(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // a small wobble is still a tap
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      setHint(false);
    }
    const nx = clamp(d.ox + dx, MARGIN, MARGIN + aw);
    const ny = clamp(d.oy + dy, MARGIN, MARGIN + ah);
    const next = { fx: aw ? (nx - MARGIN) / aw : 0, fy: ah ? (ny - MARGIN) / ah : 0 };
    posRef.current = next;
    setPos(next);
  }
  function up(e: RPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(posRef.current));
      } catch {
        // ignore
      }
    } else {
      open();
    }
  }
  function key(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  }

  return (
    <div className="fixed z-40 block" style={{ left: x, top: y, width: SIZE, height: SIZE }}>
      {hint && !dragging && (
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-xl border border-gold/50 bg-card px-3 py-2 text-xs text-white/80">
          Ask SJA. Drag me anywhere.
        </div>
      )}
      <button
        aria-label="Ask SJA. Drag to move."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        onKeyDown={key}
        className={`flex h-14 w-14 touch-none select-none items-center justify-center rounded-full border-2 border-gold bg-black text-gold shadow-lg shadow-black/70 transition-transform ${
          dragging ? "scale-110" : "active:scale-95"
        }`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
        </svg>
      </button>
    </div>
  );
}
