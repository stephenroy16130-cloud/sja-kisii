"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function IssueForm({
  instruments,
  members,
}: {
  instruments: { id: string; name: string; type: string }[];
  members: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const notes = String(f.get("notes") || "").trim();
    try {
      await api("/api/band/issue", "POST", {
        instrumentId: f.get("instrumentId"),
        userId: f.get("userId"),
        ...(notes ? { notes } : {}),
      });
      setMsg("Instrument issued");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (instruments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
        No instruments are available to issue.
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
        There are no band members yet. The Superintendent gives the Band Member title in People.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Instrument</label>
        <select name="instrumentId" required defaultValue="" className={inputCls}>
          <option value="" disabled>Choose</option>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Issue to</label>
        <select name="userId" required defaultValue="" className={inputCls}>
          <option value="" disabled>Choose</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <input name="notes" className={inputCls} placeholder="For the Saturday parade" />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Issuing..." : "Issue instrument"}</button>
      </div>
    </form>
  );
}
