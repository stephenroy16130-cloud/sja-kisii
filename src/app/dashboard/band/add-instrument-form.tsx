"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

const TYPES = ["Snare drum", "Tenor drum", "Bass drum", "Cymbals", "Bugle", "Flute", "Fife", "Baton"];

export default function AddInstrumentForm() {
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
    const opt = (k: string) => {
      const v = String(f.get(k) || "").trim();
      return v ? { [k]: v } : {};
    };
    try {
      await api("/api/band/instruments", "POST", {
        name: f.get("name"),
        type: f.get("type"),
        ...opt("serialNumber"),
        ...opt("condition"),
        ...opt("notes"),
      });
      setMsg("Instrument added");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Name</label>
        <input name="name" required className={inputCls} placeholder="Snare drum no. 3" />
      </div>
      <div>
        <label className={labelCls}>Type</label>
        <input name="type" required list="band-types" className={inputCls} placeholder="Snare drum" />
        <datalist id="band-types">
          {TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>
      <div>
        <label className={labelCls}>Serial number (optional)</label>
        <input name="serialNumber" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Condition (optional)</label>
        <input name="condition" className={inputCls} placeholder="Good" />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <input name="notes" className={inputCls} />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Adding..." : "Add instrument"}</button>
      </div>
    </form>
  );
}
