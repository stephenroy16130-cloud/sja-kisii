"use client";

import { useEffect, useState, type ReactNode } from "react";

interface ContextualTooltipProps {
  id: string; // localStorage key, e.g. "hasSeenStoreTooltip"
  title?: string;
  content: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  badge?: string;
  highlight?: boolean;
  children?: ReactNode;
  delayMs?: number;
}

export default function ContextualTooltip({
  id,
  title = "Smart Assist",
  content,
  position = "bottom",
  align = "center",
  badge = "Tip",
  highlight = true,
  children,
  delayMs = 350,
}: ContextualTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(id);
      if (!seen) {
        const timer = setTimeout(() => {
          setVisible(true);
        }, delayMs);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may fail in restricted/private contexts
    }
  }, [id, delayMs]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(id, "true");
    } catch {
      // ignore
    }
  }

  // Position classes for the tooltip popover
  const positionClasses = {
    top: "bottom-full mb-3",
    bottom: "top-full mt-3",
    left: "right-full mr-3 top-1/2 -translate-y-1/2",
    right: "left-full ml-3 top-1/2 -translate-y-1/2",
  };

  // Align classes for vertical placements (top/bottom)
  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  // Pointer / Arrow styles pointing back to target
  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gold/70 border-x-transparent border-b-transparent border-t-8 border-x-8 border-b-0",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gold/70 border-x-transparent border-t-transparent border-b-8 border-x-8 border-t-0",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gold/70 border-y-transparent border-r-transparent border-l-8 border-y-8 border-r-0",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gold/70 border-y-transparent border-l-transparent border-r-8 border-y-8 border-l-0",
  };

  return (
    <div className="relative inline-block">
      {/* Target Element with optional pulse ring */}
      <div className={`relative ${visible && highlight ? "rounded-2xl ring-2 ring-gold/70 ring-offset-2 ring-offset-black transition duration-300" : ""}`}>
        {children}
      </div>

      {visible && (
        <div
          className={`absolute z-40 w-72 sm:w-80 animate-in fade-in zoom-in-95 duration-200 ${
            positionClasses[position]
          } ${position === "top" || position === "bottom" ? alignClasses[align] : ""}`}
          role="tooltip"
        >
          {/* Arrow */}
          <div className={`absolute h-0 w-0 ${arrowClasses[position]}`} />

          {/* Card Body */}
          <div className="relative rounded-2xl border border-gold/70 bg-neutral-950 p-4 shadow-2xl shadow-gold/20 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-gold animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                  {badge} · {title}
                </span>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close tip"
                className="rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="mt-2 text-xs leading-relaxed text-white/80">
              {content}
            </div>

            {/* Action footer */}
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full bg-gradient-to-r from-gold to-amber-300 px-3.5 py-1 text-[11px] font-semibold text-black shadow-sm transition hover:brightness-110 active:scale-95"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

