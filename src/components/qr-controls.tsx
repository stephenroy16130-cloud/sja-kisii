"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

type State = "OFF" | "NOT_SET" | "EARLY" | "OPEN" | "CLOSED";
const TONE: Record<State, string> = {
  OFF: "",
  NOT_SET: "border-white/20 text-white/60",
  EARLY: "border-warn/50 text-warn",
  OPEN: "border-ok/50 text-ok",
  CLOSED: "border-bad/50 text-bad",
};

// An ISO time as the "yyyy-mm-ddThh:mm" text a date-time box wants, in the browser's own timezone
const local = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function QrControls({
  kind, id, startsAt, hasQr, version, activatesAt, expiresAt, state, stateText, manage, devLink,
}: {
  kind: string;
  id: string;
  startsAt: string;
  hasQr: boolean;
  version: string;
  activatesAt: string | null;
  expiresAt: string | null;
  state: State;
  stateText: string;
  manage: boolean;
  devLink: string | null;
}) {
  const router = useRouter();
  const [a, setA] = useState(local(activatesAt));
  const [x, setX] = useState(local(expiresAt));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await fn();
      setMsg(ok);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  const base = `/api/qr/${kind}/${id}`;
  const act = (action: "enable" | "disable" | "regenerate", ok: string) => run(() => api(base, "PUT", { action }), ok);

  function saveTimes() {
    if (!a || !x) return setError("Choose both the activation and the expiry time.");
    void run(
      () => api(`${base}/window`, "PUT", { activatesAt: new Date(a).toISOString(), expiresAt: new Date(x).toISOString() }),
      "Times saved"
    );
  }
  function clearTimes() {
    setA("");
    setX("");
    void run(() => api(`${base}/window`, "PUT", { activatesAt: null, expiresAt: null }), "Times cleared. The code is inactive.");
  }
  function suggest() {
    const s = new Date(startsAt).getTime();
    setA(local(new Date(s - 15 * 60000).toISOString()));
    setX(local(new Date(s + 2 * 3600000).toISOString()));
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">QR check-in</p>
          <p className="mt-1 text-sm text-white/60">
            {hasQr
              ? "The code is created. Set when it opens and closes below."
              : "Turn this on to create a QR code members can scan. It is made instantly, and you set when it opens afterwards."}
          </p>
        </div>
        {hasQr && (
          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${TONE[state]}`}>
            {stateText}
          </span>
        )}
      </div>

      {!hasQr && manage && (
        <button
          disabled={busy}
          onClick={() => act("enable", "QR check-in is on")}
          className="mt-4 rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Creating..." : "Enable QR code check-in"}
        </button>
      )}

      {hasQr && (
        <div className="mt-5 grid gap-6 sm:grid-cols-[200px_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${base}/image?format=svg&v=${version}`} alt="QR code" className="w-full rounded-2xl bg-white p-2" />
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a href={`${base}/image?format=png&download=1`} className={btnGhostCls}>PNG</a>
              <a href={`${base}/image?format=svg&download=1`} className={btnGhostCls}>SVG</a>
              <Link href={`/qr/${kind}/${id}`} target="_blank" className={btnGhostCls}>Print</Link>
            </div>
          </div>

          <div className="space-y-4">
            {manage ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Activation time</label>
                    <input type="datetime-local" value={a} onChange={(e) => setA(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Expiry time</label>
                    <input type="datetime-local" value={x} onChange={(e) => setX(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={saveTimes}
                    className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save times"}
                  </button>
                  <button disabled={busy} onClick={suggest} className={btnGhostCls}>Fill from event time</button>
                  {(activatesAt || expiresAt) && (
                    <button disabled={busy} onClick={clearTimes} className={btnGhostCls}>Clear</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 border-t border-white/10 pt-4 text-xs text-white/50">
                  <button
                    disabled={busy}
                    onClick={() => window.confirm("Make a new code? The old printed code will stop working.") && act("regenerate", "New code created. Reprint it.")}
                    className="underline hover:text-white"
                  >
                    Make a new code
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => window.confirm("Turn off QR check-in? The code and its times will be removed.") && act("disable", "QR check-in is off")}
                    className="underline hover:text-white"
                  >
                    Turn off
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/60">The activation and expiry times are set by the DO in charge.</p>
            )}
            <p className="text-xs text-white/40">
              Members scan with the Check in page in the app, or with their phone camera. Each scan then waits for a
              leader to confirm it.
            </p>
            {devLink && (
              <p className="break-all text-xs text-white/30">
                Test link (development only): <span className="text-white/50">{devLink}</span>
              </p>
            )}
          </div>
        </div>
      )}
      {msg && <p className="mt-4 text-sm text-ok">{msg}</p>}
      {error && <p className="mt-4 text-sm text-bad">{error}</p>}
    </section>
  );
}
