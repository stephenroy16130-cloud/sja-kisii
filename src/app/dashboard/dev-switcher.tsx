"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export type DevUser = { id: string; fullName: string; role: string };

export default function DevSwitcher({ users, currentId }: { users: DevUser[]; currentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function switchTo(id: string) {
    if (id === currentId || busyId) return;
    setBusyId(id);
    setError("");
    try {
      await api("/api/dev/switch-user", "POST", { userId: id });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusyId("");
  }

  const current = users.find((u) => u.id === currentId);

  return (
    <div className="fixed bottom-24 left-3 z-40 lg:bottom-4 lg:left-4">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-dashed border-warn/60 bg-card p-2 shadow-2xl">
          <p className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-warn">Dev · switch user</p>
          <div className="max-h-80 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => switchTo(u.id)}
                disabled={!!busyId}
                className={`block w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/10 disabled:opacity-50 ${
                  u.id === currentId ? "bg-white/10" : ""
                }`}
              >
                <span className="block text-sm">{u.fullName}</span>
                <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40">{u.role}</span>
              </button>
            ))}
          </div>
          {error && <p className="px-3 pt-2 text-xs text-bad">{error}</p>}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-dashed border-warn/60 bg-black px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-warn"
      >
        Dev
        <span className="normal-case tracking-normal text-white/60">{current ? current.fullName : "not a test account"}</span>
      </button>
    </div>
  );
}
