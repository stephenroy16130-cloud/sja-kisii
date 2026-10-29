"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

type T = "DRILL" | "FIRST_AID";
const label: Record<T, string> = { DRILL: "Drill", FIRST_AID: "First Aid" };

export default function CreateTrainingForm({
  types,
  canPickCrew,
  autoVerified,
}: {
  types: T[];
  canPickCrew: boolean;
  autoVerified: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<T>(types[0]);
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
    const description = String(f.get("description") || "").trim();
    const crew = String(f.get("crewId") || "");
    try {
      await api("/api/training", "POST", {
        type,
        title: f.get("title"),
        heldAt: new Date(String(f.get("heldAt"))).toISOString(),
        ...(description ? { description } : {}),
        ...(type === "FIRST_AID" && canPickCrew ? { crewId: crew ? Number(crew) : null } : {}),
      });
      setMsg(autoVerified ? "Record created and verified" : "Record created. It is pending until DO Training verifies it.");
      form.reset();
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
      {types.length > 1 && (
        <div className="sm:col-span-2">
          <label className={labelCls}>Type</label>
          <div className="flex gap-2">
            {types.map((t) => (
              <button key={t} type="button" onClick={() => setType(t)} className={pill(type === t)}>
                {label[t]}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls}>Title</label>
        <input
          name="title"
          required
          className={inputCls}
          placeholder={type === "DRILL" ? "Foot drill and parade formation" : "Bleeding control and bandaging"}
        />
      </div>
      <div>
        <label className={labelCls}>Held on</label>
        <input name="heldAt" type="datetime-local" required className={inputCls} />
      </div>
      {type === "FIRST_AID" && canPickCrew ? (
        <div>
          <label className={labelCls}>Crew</label>
          <select name="crewId" defaultValue="" className={inputCls}>
            <option value="">All crews</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{crewName(n)}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="self-end text-sm text-white/50">
          {type === "DRILL" ? "Drills are open to all crews." : "First Aid is recorded for your own crew."}
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <textarea name="description" rows={3} className={inputCls} />
      </div>
      {!autoVerified && (
        <p className="text-xs text-white/40 sm:col-span-2">
          Your record starts as Pending. Points only count after DO Training verifies it.
        </p>
      )}
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create record"}</button>
      </div>
    </form>
  );
}
