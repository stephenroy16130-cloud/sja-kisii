"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { crewColor, crewName } from "@/lib/crews";
import { btnCls } from "@/lib/ui";

export type RosterMember = {
  id: string;
  fullName: string;
  username: string;
  crewId: number | null;
  status: "PRESENT" | "ABSENT";
};

export default function TrainingRoster({ trainingId, members }: { trainingId: string; members: RosterMember[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, "PRESENT" | "ABSENT">>(
    Object.fromEntries(members.map((m) => [m.id, m.status]))
  );
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const present = Object.values(state).filter((s) => s === "PRESENT").length;
  const markAll = (s: "PRESENT" | "ABSENT") => setState(Object.fromEntries(members.map((m) => [m.id, s])));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await api(`/api/training/${trainingId}/attendance`, "POST", {
        records: members.map((m) => ({ userId: m.id, status: state[m.id] })),
      });
      setMsg("Attendance saved");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  if (members.length === 0) return <p className="text-sm text-white/50">No active members for this session yet.</p>;

  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs text-white/50">
        <button type="button" onClick={() => markAll("PRESENT")} className="underline hover:text-white">
          Mark all present
        </button>
        <button type="button" onClick={() => markAll("ABSENT")} className="underline hover:text-white">
          Clear
        </button>
      </div>
      <div className="divide-y divide-white/10">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{m.fullName}</p>
              <p className="flex items-center gap-2 text-xs text-white/40">
                @{m.username}
                {m.crewId && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: crewColor(m.crewId) }} />
                    {crewName(m.crewId)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex overflow-hidden rounded-full border border-white/20 text-xs">
              {(["PRESENT", "ABSENT"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState((cur) => ({ ...cur, [m.id]: s }))}
                  className={`px-4 py-2 transition ${
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
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-white/50">{present} marked present</p>
        <div className="w-40">
          <button disabled={busy} onClick={save} className={btnCls}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {msg && <p className="mt-3 text-sm text-white/60">{msg}</p>}
    </div>
  );
}
