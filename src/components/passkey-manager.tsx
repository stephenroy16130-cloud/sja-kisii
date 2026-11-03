"use client";

import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

type Item = { id: string; deviceName: string | null; createdAt: string; lastUsedAt: string | null };
const day = (s: string) => new Date(s).toLocaleDateString("en-KE", { dateStyle: "medium" });

export default function PasskeyManager() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/passkeys");
      const j = await r.json();
      setItems(j.passkeys ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
    void load();
  }, [load]);

  async function add() {
    setBusy(true);
    setMsg("");
    try {
      const options = await api("/api/passkeys/register/options", "POST");
      const response = await startRegistration({ optionsJSON: options });
      await api("/api/passkeys/register/verify", "POST", { response });
      setMsg("This device can now sign you in with fingerprint, face or screen lock.");
      await load();
    } catch (e) {
      const n = (e as { name?: string }).name;
      setMsg(
        n === "NotAllowedError"
          ? "Cancelled. Make sure this device has a screen lock, fingerprint or face set up."
          : e instanceof Error
            ? e.message
            : "Could not add this device"
      );
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this device from fingerprint sign-in?")) return;
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/passkeys/${encodeURIComponent(id)}`, "DELETE");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not remove it");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Fingerprint and face sign-in</p>
      <p className="mt-2 text-sm text-white/60">
        Sign in without typing your password. Your fingerprint or face never leaves your device.
      </p>

      {!supported ? (
        <p className="mt-4 text-sm text-white/50">This browser does not support fingerprint sign-in.</p>
      ) : (
        <>
          {items && items.length > 0 && (
            <ul className="mt-4 divide-y divide-white/10">
              {items.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p>{p.deviceName ?? "Device"}</p>
                    <p className="mt-0.5 text-xs text-white/40">
                      Added {day(p.createdAt)}
                      {p.lastUsedAt ? ` · last used ${day(p.lastUsedAt)}` : " · not used yet"}
                    </p>
                  </div>
                  <button disabled={busy} onClick={() => remove(p.id)} className={btnGhostCls}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <button
              disabled={busy}
              onClick={add}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Working..." : "Add this device"}
            </button>
          </div>
        </>
      )}
      {msg && <p className="mt-3 text-sm text-white/70">{msg}</p>}
    </section>
  );
}
