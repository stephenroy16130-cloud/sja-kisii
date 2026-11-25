"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export type Item = { id: string; title: string; body: string; url: string | null; read: boolean; at: string };

const refreshBell = () => window.dispatchEvent(new Event("sja-notifications"));

export default function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const unread = items.filter((i) => !i.read).length;

  async function open(n: Item) {
    if (!n.read) {
      await api("/api/notifications/read", "POST", { id: n.id }).catch(() => undefined);
      refreshBell();
    }
    router.push(n.url ?? "/dashboard");
    router.refresh();
  }

  async function markAll() {
    setBusy(true);
    setError("");
    try {
      await api("/api/notifications/read", "POST", { all: true });
      refreshBell();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark them as read");
    }
    setBusy(false);
  }

  async function clearAll() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = (await api("/api/notifications/clear", "POST")) as { removed?: number };
      setAsking(false);
      setMsg(`Cleared ${r.removed ?? 0} notifications.`);
      refreshBell();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear your notifications");
    }
    setBusy(false);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-light">
          Your notifications {unread > 0 && <span className="text-sm text-bad">· {unread} unread</span>}
        </h2>
        {items.length > 0 && !asking && (
          <div className="flex flex-wrap gap-2">
            {unread > 0 && (
              <button disabled={busy} onClick={markAll} className={btnGhostCls}>
                Mark all as read
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => setAsking(true)}
              className="rounded-full border border-bad/50 px-5 py-2.5 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {asking && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-bad/40 p-4">
          <span className="text-sm text-white/80">Delete all {items.length} notifications? This cannot be undone.</span>
          <button
            disabled={busy}
            onClick={clearAll}
            className="rounded-full bg-bad px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Deleting..." : "Yes, delete all"}
          </button>
          <button disabled={busy} onClick={() => setAsking(false)} className={btnGhostCls}>
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-bad">{error}</p>}
      {msg && <p className="mb-4 text-sm text-ok">{msg}</p>}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
          Nothing yet. Alerts about meetings, payments and decisions appear here.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={`flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-white/40 ${
                n.read ? "border-white/10" : "border-gold/50"
              }`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-bad"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read ? "text-white/70" : "font-medium"}`}>{n.title}</span>
                <span className="mt-0.5 block text-xs text-white/50">{n.body}</span>
                <span className="mt-1 block text-[11px] text-white/30">{n.at}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
