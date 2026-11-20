"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function AdmissionNumber({ memberId }: { memberId: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    api(`/api/admin/members/${memberId}/admission`, "GET")
      .then((r) => {
        if (!live) return;
        setValue(r.admissionNumber as string);
        setDraft(r.admissionNumber as string);
      })
      .catch(() => live && setValue(""));
    return () => {
      live = false;
    };
  }, [memberId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await api(`/api/admin/members/${memberId}/admission`, "PUT", { admissionNumber: draft });
      setValue((r.admissionNumber as string | null) ?? "");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-white/40">Admission number</p>
      {value === null ? (
        <p className="mt-1 text-sm text-white/40">Loading...</p>
      ) : editing ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="SC211/1234/2022" className={`${inputCls} max-w-xs`} />
          <button disabled={busy} onClick={save} className={btnGhostCls}>{busy ? "Saving..." : "Save"}</button>
          <button disabled={busy} onClick={() => { setEditing(false); setDraft(value); setError(""); }} className={btnGhostCls}>Cancel</button>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-sm">{value || <span className="text-white/40">Not added yet</span>}</p>
          <button onClick={() => setEditing(true)} className="text-xs text-white/50 underline hover:text-white">
            {value ? "Edit" : "Add"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
