"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewColor, crewName } from "@/lib/crews";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function CreateFieldOpForm() {
  const router = useRouter();
  const [allCrews, setAllCrews] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const endsAt = String(f.get("endsAt") || "");
    const location = String(f.get("location") || "").trim();
    const description = String(f.get("description") || "").trim();
    try {
      await api("/api/fieldops", "POST", {
        title: f.get("title"),
        startsAt: new Date(String(f.get("startsAt"))).toISOString(),
        ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
        ...(location ? { location } : {}),
        ...(description ? { description } : {}),
        allCrews,
        crewIds: allCrews ? [] : selected,
      });
      setMsg("Operation created");
      form.reset();
      setSelected([]);
      setAllCrews(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-2 text-xs transition ${
      active ? "border-white bg-white text-black" : "border-white/20 text-white/60 hover:border-white/50"
    }`;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>Title</label>
        <input name="title" required className={inputCls} placeholder="Community health outreach" />
      </div>
      <div>
        <label className={labelCls}>Starts</label>
        <input name="startsAt" type="datetime-local" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Ends (optional)</label>
        <input name="endsAt" type="datetime-local" className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Location</label>
        <input name="location" className={inputCls} placeholder="Kisii Level 5 Hospital grounds" />
      </div>

      <div className="sm:col-span-2">
        <label className={labelCls}>Who attends</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAllCrews(true)} className={pill(allCrews)}>
            All crews
          </button>
          <button type="button" onClick={() => setAllCrews(false)} className={pill(!allCrews)}>
            Specific crews
          </button>
        </div>
        {!allCrews && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {[1, 2, 3, 4].map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(id)}
                  onChange={() => toggle(id)}
                  className="accent-white"
                />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: crewColor(id) }} />
                {crewName(id)}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <textarea name="description" rows={3} className={inputCls} />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create operation"}</button>
      </div>
    </form>
  );
}
