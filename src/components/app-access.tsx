"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const HIDE_KEY = "sja-app-nudge";
const HIDE_DAYS = 14;

function keyBytes(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const solid =
  "rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50";

export default function AppAccess({ mode }: { mode: "nudge" | "full" }) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [pushOk, setPushOk] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushOk(false);
      return;
    }
    setPushOk(Boolean(KEY));
    setPerm(Notification.permission);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(sub));
      // Attach this device to whoever is signed in now. No prompt is shown.
      if (sub && Notification.permission === "granted" && !sessionStorage.getItem("sja-push-synced")) {
        const j = sub.toJSON();
        await api("/api/push/subscribe", "POST", { endpoint: j.endpoint, keys: j.keys });
        sessionStorage.setItem("sja-push-synced", "1");
      }
    } catch {
      // ignore: the card simply stays as it is
    }
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    setIos(/iphone|ipad|ipod/i.test(nav.userAgent) || (nav.maxTouchPoints > 1 && /macintosh/i.test(nav.userAgent)));
    try {
      const t = Number(localStorage.getItem(HIDE_KEY) || 0);
      if (t && Date.now() - t < HIDE_DAYS * 86_400_000) setHidden(true);
    } catch {
      // storage can be blocked
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstall(null);
      setStandalone(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    void refresh();
    setReady(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setMsg("");
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings, then try again.");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const j = sub.toJSON();
      await api("/api/push/subscribe", "POST", { endpoint: j.endpoint, keys: j.keys });
      sessionStorage.setItem("sja-push-synced", "1");
      setSubscribed(true);
      setMsg("Notifications are on for this device.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not turn on notifications");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api("/api/push/subscribe", "DELETE", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Notifications are off for this device.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not turn off notifications");
    }
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setMsg("");
    try {
      const r = (await api("/api/push/test", "POST")) as { devices: number };
      setMsg(r.devices > 0 ? "Test sent. It should arrive in a few seconds, and it is saved in your notifications." : "Saved in your notifications. No phone is registered for alerts yet.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send the test");
    }
    setBusy(false);
  }

  async function doInstall() {
    if (!install) return;
    await install.prompt();
    await install.userChoice;
    setInstall(null);
  }

  function dismiss() {
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  }

  if (!ready) return null;

  const needInstall = !standalone && (install !== null || ios);
  const needPush = pushOk && !subscribed && perm !== "denied" && (!ios || standalone);

  if (mode === "nudge") {
    if (hidden || (!needInstall && !needPush)) return null;
    return (
      <section className="rounded-3xl border border-white/10 bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Get the app</p>
            <p className="mt-2 text-sm text-white/70">
              {needInstall && needPush
                ? "Install SJA Kisii on your phone and get notified about articles and decisions."
                : needInstall
                  ? "Install SJA Kisii on your home screen for one-tap access."
                  : "Get notified about articles and decisions on this device."}
            </p>
          </div>
          <button onClick={dismiss} aria-label="Dismiss" className="text-2xl leading-none text-white/40 hover:text-white">
            ×
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {install && !standalone && (
            <button onClick={doInstall} className={solid}>
              Install app
            </button>
          )}
          {needPush && (
            <button disabled={busy} onClick={enable} className={install && !standalone ? btnGhostCls : solid}>
              {busy ? "Working..." : "Turn on notifications"}
            </button>
          )}
        </div>
        {ios && !standalone && (
          <p className="mt-3 text-xs text-white/50">
            On iPhone: tap the Share button in Safari, then Add to Home Screen. Notifications work after that.
          </p>
        )}
        {msg && <p className="mt-3 text-sm text-white/60">{msg}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">App and notifications</p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 text-sm">
        <span className="text-white/70">App</span>
        {standalone ? (
          <span className="text-ok">Installed</span>
        ) : install ? (
          <button onClick={doInstall} className={solid}>
            Install app
          </button>
        ) : ios ? (
          <span className="max-w-xs text-right text-xs text-white/50">Tap Share in Safari, then Add to Home Screen.</span>
        ) : (
          <span className="max-w-xs text-right text-xs text-white/50">
            Use your browser menu and choose Install app or Add to Home screen.
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-white/70">Notifications on this device</span>
        {!pushOk ? (
          <span className="max-w-xs text-right text-xs text-white/50">
            {ios && !standalone ? "Install the app first, then turn them on." : "Not available in this browser."}
          </span>
        ) : subscribed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ok">On</span>
            <button disabled={busy} onClick={test} className={btnGhostCls}>
              Send test
            </button>
            <button disabled={busy} onClick={disable} className={btnGhostCls}>
              Turn off
            </button>
          </div>
        ) : perm === "denied" ? (
          <span className="max-w-xs text-right text-xs text-warn">
            Blocked. Allow notifications for this site in your browser settings.
          </span>
        ) : (
          <button disabled={busy} onClick={enable} className={solid}>
            {busy ? "Working..." : "Turn on"}
          </button>
        )}
      </div>
      {msg && <p className="mt-3 text-sm text-white/60">{msg}</p>}
    </section>
  );
}
