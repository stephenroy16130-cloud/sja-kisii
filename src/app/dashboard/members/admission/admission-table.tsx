"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { crewColor } from "@/lib/crews";
import { btnGhostCls, inputCls } from "@/lib/ui";

type Row = { id: string; name: string; crewId: number | null; crew: string; admission: string };

function Line({ row, onSaved }: { row: Row; onSaved: (id: string, v: string) => void }) {
  const [v, setV] = useState(row.admission);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const dirty = v.trim() !== row.admission;

  async function save() {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const r = await api(`/api/admin/members/${row.id}/admission`, "PUT", { admissionNumber: v });
      const saved = (r.admissionNumber as string | null) ?? "";
      setV(saved);
      onSaved(row.id, saved);
      setMsg("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <div className="min-w-0">
        <p className="text-sm uppercase tracking-wide">{row.name}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-white/40">
          {row.crewId && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: crewColor(row.crewId) }} />}
          {row.crew}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            setMsg("");
          }}
          placeholder="SC211/1234/26"
          autoCapitalize="characters"
          className={`${inputCls} !w-44 !py-2`}
          aria-label={`Admission number for ${row.name}`}
        />
        <button disabled={busy || !dirty} onClick={save} className={`${btnGhostCls} disabled:opacity-40`}>
          {busy ? "Saving..." : "Save"}
        </button>
        {msg && <span className="text-xs text-ok">{msg}</span>}
      </div>
      {error && <p className="w-full text-xs text-bad">{error}</p>}
    </div>
  );
}

export default function AdmissionTable({ rows }: { rows: Row[] }) {
  const [list, setList] = useState(rows);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState("");

  const have = list.filter((r) => r.admission).length;
  const pct = list.length ? Math.round((have / list.length) * 100) : 0;
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter(
      (r) => (!missing || !r.admission) && (!s || r.name.toLowerCase().includes(s) || r.admission.toLowerCase().includes(s) || r.crew.toLowerCase().includes(s))
    );
  }, [list, missing, q]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-card p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span>
            <span className="text-gold">{have}</span> of {list.length} members have an admission number
          </span>
          <span className="text-white/50">{list.length - have} missing</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, crew or number" className={`${inputCls} !w-64 !py-2`} />
          <button
            onClick={() => setMissing((m) => !m)}
            className={`rounded-full border px-4 py-2 text-xs transition ${missing ? "border-white bg-white text-black" : "border-white/30 text-white/70 hover:border-white"}`}
          >
            Only missing
          </button>
          <a
            href="/api/admin/members/admission/export"
            className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
          >
            Download list (CSV)
          </a>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">No one matches.</div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <Line
              key={r.id}
              row={r}
              onSaved={(id, v) => setList((cur) => cur.map((x) => (x.id === id ? { ...x, admission: v } : x)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
