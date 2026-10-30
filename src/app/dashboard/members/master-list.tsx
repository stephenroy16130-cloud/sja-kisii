"use client";

import { useCallback, useMemo, useState } from "react";
import Avatar from "@/components/avatar";
import { crewColor, crewName } from "@/lib/crews";
import { inputCls } from "@/lib/ui";
import MemberDrawer from "./member-drawer";

export type MemberRow = {
  id: string;
  fullName: string;
  nickname: string | null;
  photo: string | null;
  crewId: number | null;
  titles: string[];
  complete: boolean;
};

export default function MasterList({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [crew, setCrew] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members.filter(
      (m) =>
        (!crew || String(m.crewId ?? "none") === crew) &&
        (!s || m.fullName.toLowerCase().includes(s) || (m.nickname ?? "").toLowerCase().includes(s))
    );
  }, [members, q, crew]);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className={inputCls} />
        <select value={crew} onChange={(e) => setCrew(e.target.value)} className={inputCls}>
          <option value="">All crews</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{crewName(n)}</option>
          ))}
          <option value="none">No crew</option>
        </select>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">No members match.</div>
      ) : (
        <div className="space-y-2">
          {list.map((m) => (
            <button
              key={m.id}
              onClick={() => setOpenId(m.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-card p-4 text-left transition hover:border-white/30"
            >
              <Avatar name={m.nickname || m.fullName} src={m.photo} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium uppercase tracking-wide">{m.fullName}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                  {m.crewId ? (
                    <>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(m.crewId) }} />
                      {crewName(m.crewId)}
                    </>
                  ) : (
                    "No crew"
                  )}
                  {m.titles.length > 0 && (
                    <span className="text-gold">
                      · {m.titles[0].replace(/_/g, " ")}
                      {m.titles.length > 1 ? ` +${m.titles.length - 1}` : ""}
                    </span>
                  )}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${
                  m.complete ? "border-ok/50 text-ok" : "border-warn/50 text-warn"
                }`}
              >
                {m.complete ? "Complete" : "Incomplete"}
              </span>
            </button>
          ))}
        </div>
      )}

      {openId && <MemberDrawer key={openId} memberId={openId} onClose={close} />}
    </div>
  );
}
