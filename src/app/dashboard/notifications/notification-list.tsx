"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnGhostCls } from "@/lib/ui";

export type Item = { id: string; title: string; body: string; url: string | null; read: boolean; at: string };

async function mark(body: { id?: string; all?: boolean }) {
  await fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => undefined);
  window.dispatchEvent(new Event("sja-notifications"));
}

export default function NotificationList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((i) => !i.read).length;

  async function open(n: Item) {
    if (!n.read) await mark({ id: n.id });
    router.push(n.url ?? "/dashboard");
    router.refresh();
  }
  async function markAll() {
    setBusy(true);
    await mark({ all: true });
    router.refresh();
    setBusy(false);
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-light">
          Your notifications {unread > 0 && <span className="text-sm text-bad">· {unread} unread</span>}
        </h2>
        {unread > 0 && (
          <button disabled={busy} onClick={markAll} className={btnGhostCls}>
            Mark all as read
          </button>
        )}
      </div>

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
