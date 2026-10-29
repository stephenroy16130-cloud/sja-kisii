"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnCls } from "@/lib/ui";

type Status = "PRESENT" | "ABSENT" | "EXCUSED";
export type RosterMember = { id: string; fullName: string; username: string; status: Status };

export default function AttendanceRoster({
  meetingId,
  members,
  open,
  opensAt,
}: {
  meetingId: string;
  members: RosterMember[];
  open: boolean;
  opensAt: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, Status>>(
    Object.fromEntries(members.map((m) => [m.id, m.status]))
  );
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const present = Object.values(state).filter((s) => s === "PRESENT").length;

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/meetings/${meetingId}/attendance`, "POST", {
        records: members.map((m) => ({
          userId: m.id,
          status: m.status === "EXCUSED" ? "ABSENT" : state[m.id],
        })),
      });
      setMsg("Attendance saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  if (members.length === 0) return <p className="text-sm text-white/50">No active members in your crew yet.</p>;

  return (
    <div>
      {!open && <p className="mb-4 text-sm text-warn">Attendance opens when the meeting starts ({opensAt}).</p>}
      <div className="divide-y divide-white/10">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{m.fullName}</p>
              <p className="text-xs text-white/40">@{m.username}</p>
            </div>
            {m.status === "EXCUSED" ? (
              <span className="rounded-full border border-warn/50 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-warn">
                Excused
              </span>
            ) : (
              <div className="flex overflow-hidden rounded-full border border-white/20 text-xs">
                {(["PRESENT", "ABSENT"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={!open}
                    onClick={() => setState((cur) => ({ ...cur, [m.id]: s }))}
                    className={`px-4 py-2 transition disabled:opacity-40 ${
                      state[m.id] === s
                        ? s === "PRESENT"
                          ? "bg-ok text-black"
                          : "bg-bad text-black"
                        : "text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {s === "PRESENT" ? "Present" : "Absent"}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-white/50">{present} marked present</p>
        <div className="w-40">
          <button disabled={busy || !open} onClick={save} className={btnCls}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-white/60">{msg}</p>}
    </div>
  );
}
