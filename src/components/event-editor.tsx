"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

type Props = {
  kind: "meeting" | "fieldop" | "training";
  id: string;
  backHref: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  hasEnds: boolean;
  showCrews: boolean;
  allCrews: boolean;
  crewIds: number[];
  locked: string | null;
};

const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function EventEditor(p: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(p.allCrews);
  const [crews, setCrews] = useState<number[]>(p.crewIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    const f = new FormData(e.currentTarget);
    const ends = String(f.get("endsAt") || "");
    try {
      await api(`/api/events/${p.kind}/${p.id}`, "PUT", {
        title: f.get("title"),
        startsAt: new Date(String(f.get("startsAt"))).toISOString(),
        ...(p.description !== null ? { description: String(f.get("description") ?? "") } : {}),
        ...(p.location !== null ? { location: String(f.get("location") ?? "") } : {}),
        ...(p.hasEnds ? { endsAt: ends ? new Date(ends).toISOString() : null } : {}),
        ...(p.showCrews ? { allCrews: all, crewIds: all ? [] : crews } : {}),
      });
      setEditing(false);
      setMsg("Saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  async function remove() {
    if (
      !window.confirm(
        "Delete this?\n\nIf nobody's attendance has been recorded, it is removed for good and members are told it was cancelled. If attendance is already recorded, it is hidden and the records stay for points and history."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/events/${p.kind}/${p.id}`, "DELETE");
      router.push(p.backHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Manage</p>
          <p className="mt-1 text-sm text-white/60">Posted something wrong? Fix it or take it down.</p>
        </div>
        {!p.locked && !editing && (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className={btnGhostCls}>Edit</button>
            <button
              disabled={busy}
              onClick={remove}
              className="rounded-full border border-bad/50 px-5 py-2.5 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
            >
              {busy ? "Working..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      {p.locked && <p className="mt-3 text-sm text-warn">{p.locked}</p>}

      {editing && (
        <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title</label>
            <input name="title" required defaultValue={p.title} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Starts</label>
            <input name="startsAt" type="datetime-local" required defaultValue={local(p.startsAt)} className={inputCls} />
          </div>
          {p.hasEnds && (
            <div>
              <label className={labelCls}>Ends (optional)</label>
              <input name="endsAt" type="datetime-local" defaultValue={p.endsAt ? local(p.endsAt) : ""} className={inputCls} />
            </div>
          )}
          {p.location !== null && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Venue</label>
              <input name="location" defaultValue={p.location} className={inputCls} />
            </div>
          )}
          {p.description !== null && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea name="description" rows={3} defaultValue={p.description} className={inputCls} />
            </div>
          )}
          {p.showCrews && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Crews</label>
              <label className="mb-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-white" />
                All crews
              </label>
              {!all && (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {[1, 2, 3, 4].map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={crews.includes(c)}
                        onChange={() => setCrews((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))}
                        className="accent-white"
                      />
                      {crewName(c)}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-white/40 sm:col-span-2">
            If you change the time, remember to adjust the QR check-in times below. Members are told about a new title or time.
          </p>
          {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              disabled={busy}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className={btnGhostCls}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {!editing && msg && <p className="mt-3 text-sm text-ok">{msg}</p>}
      {!editing && error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </section>
  );
}
