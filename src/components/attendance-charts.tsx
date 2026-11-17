import type { ReactNode } from "react";

export const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
// Green from 75%, amber from 50%, red below
export const toneOf = (pct: number) => (pct >= 75 ? "ok" : pct >= 50 ? "warn" : "bad") as "ok" | "warn" | "bad";

const BG = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" } as const;
const TEXT = { ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;
const STROKE = { ok: "stroke-ok", warn: "stroke-warn", bad: "stroke-bad" } as const;

// "5 of 7 attended · 71%" with a bar under it
export function ProgressBar({ label, present, total, dot }: { label: string; present: number; total: number; dot?: string }) {
  const pct = pctOf(present, total);
  const t = toneOf(pct);
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="flex items-center gap-2">
          {dot && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dot }} />}
          {label}
        </span>
        <span className="text-white/60">
          {total > 0 ? (
            <>
              <span className={`font-medium ${TEXT[t]}`}>{present}</span> of {total} attended · {pct}%
            </>
          ) : (
            "Nothing recorded yet"
          )}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`h-full rounded-full ${BG[t]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Ring({ pct, size = 132, children }: { pct: number; size?: number; children?: ReactNode }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const t = toneOf(pct);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-white/10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          className={STROKE[t]}
          strokeDasharray={`${(Math.min(100, pct) / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// One bar per week: green for attended, red for missed, with "attended/recorded" above it
export function WeeklyBars({ weeks }: { weeks: { label: string; present: number; absent: number }[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.present + w.absent));
  return (
    <div>
      <div className="flex gap-2">
        {weeks.map((w) => {
          const total = w.present + w.absent;
          return (
            <div key={w.label} className="flex flex-1 flex-col items-center">
              <span className="h-4 text-[10px] text-white/50">{total ? `${w.present}/${total}` : ""}</span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md bg-white/5"
                  style={{ height: `${Math.max(total ? 6 : 2, (total / max) * 100)}%` }}
                >
                  <div className="bg-ok" style={{ height: `${total ? (w.present / total) * 100 : 0}%` }} />
                  <div className="bg-bad" style={{ height: `${total ? (w.absent / total) * 100 : 0}%` }} />
                </div>
              </div>
              <span className="mt-2 text-[10px] text-white/40">{w.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ok" /> Attended</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" /> Missed</span>
      </div>
    </div>
  );
}
