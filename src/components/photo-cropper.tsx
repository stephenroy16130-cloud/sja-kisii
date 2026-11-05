"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { btnGhostCls } from "@/lib/ui";

const VIEW = 280; // the square the person sees, in pixels
const OUT = 400; // the saved photo, in pixels

type Pt = { x: number; y: number };

export default function PhotoCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const [src, setSrc] = useState("");
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const min = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1; // smallest size that still fills the frame
  const max = min * 4;

  const clamp = (p: Pt, s: number): Pt =>
    nat ? { x: Math.min(0, Math.max(VIEW - nat.w * s, p.x)), y: Math.min(0, Math.max(VIEW - nat.h * s, p.y)) } : p;

  function onLoad() {
    const img = imgRef.current;
    if (!img) return;
    const n = { w: img.naturalWidth, h: img.naturalHeight };
    const s = Math.max(VIEW / n.w, VIEW / n.h);
    setNat(n);
    setScale(s);
    setPos({ x: (VIEW - n.w * s) / 2, y: (VIEW - n.h * s) / 2 });
  }

  // Zoom while keeping the middle of the frame where it is
  function zoomTo(next: number) {
    if (!nat) return;
    const s = Math.min(max, Math.max(min, next));
    const cx = (VIEW / 2 - pos.x) / scale;
    const cy = (VIEW / 2 - pos.y) / scale;
    setScale(s);
    setPos(clamp({ x: VIEW / 2 - cx * s, y: VIEW / 2 - cy * s }, s));
  }

  function down(e: RPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
  }

  function move(e: RPointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev || !nat) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.dist > 0) zoomTo(pinch.current.scale * (d / pinch.current.dist));
    } else if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setPos((p) => clamp({ x: p.x + dx, y: p.y + dy }, scale));
    }
  }

  function up(e: RPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function save() {
    const img = imgRef.current;
    if (!img || !nat) return;
    setBusy(true);
    setError("");
    const c = document.createElement("canvas");
    c.width = OUT;
    c.height = OUT;
    const ctx = c.getContext("2d");
    if (!ctx) {
      setError("Could not process the image");
      setBusy(false);
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -pos.x / scale, -pos.y / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    c.toBlob(
      (b) => {
        if (b) onDone(b);
        else {
          setError("Could not process the image");
          setBusy(false);
        }
      },
      "image/jpeg",
      0.85
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl border border-white/10 bg-card p-6">
        <h3 className="text-xl font-light">Adjust your photo</h3>
        <p className="mb-4 mt-1 text-xs text-white/50">Drag to move. Pinch or use the slider to zoom.</p>

        <div
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(e) => zoomTo(scale * (e.deltaY < 0 ? 1.08 : 0.92))}
          className="relative mx-auto touch-none select-none overflow-hidden rounded-2xl bg-neutral-900"
          style={{ width: VIEW, height: VIEW, cursor: "grab" }}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onLoad}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                maxWidth: "none",
                width: nat ? nat.w * scale : "auto",
                height: nat ? nat.h * scale : "auto",
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                opacity: nat ? 1 : 0,
                pointerEvents: "none",
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0 rounded-full border border-white/70"
            style={{ boxShadow: "0 0 0 999px rgba(0,0,0,0.6)" }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="text-xs text-white/40">−</span>
          <input
            type="range"
            min={min}
            max={max}
            step={(max - min) / 200 || 0.001}
            value={scale}
            disabled={!nat}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="w-full accent-white"
            aria-label="Zoom"
          />
          <span className="text-xs text-white/40">+</span>
        </div>

        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onCancel} className={btnGhostCls}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !nat}
            onClick={save}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
