"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { crewName } from "@/lib/crews";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function CreateCollectionForm() {
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
    const crew = String(f.get("crewId") || "");
    const closes = String(f.get("closesAt") || "");
    const description = String(f.get("description") || "").trim();
    try {
      const c = await api("/api/collections", "POST", {
        title: f.get("title"),
        amount: Number(f.get("amount")),
        ...(description ? { description } : {}),
        ...(crew ? { crewId: Number(crew) } : { crewId: null }),
        ...(closes ? { closesAt: new Date(closes).toISOString() } : {}),
      });
      form.reset();
      setMsg("Activity created. People can pay now.");
      router.push(`/dashboard/finance/collections/${c.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>What is the payment for?</label>
        <input name="title" required className={inputCls} placeholder="Division trip" />
      </div>
      <div>
        <label className={labelCls}>Price per person (KES)</label>
        <input name="amount" type="number" min="1" step="1" required className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Who pays</label>
        <select name="crewId" defaultValue="" className={inputCls}>
          <option value="">All members</option>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{crewName(n)} only</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Closes at (optional)</label>
        <input name="closesAt" type="datetime-local" className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes (optional)</label>
        <textarea name="description" rows={2} className={inputCls} />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      {msg && <p className="text-sm text-ok sm:col-span-2">{msg}</p>}
      <div className="sm:col-span-2">
        <button disabled={busy} className={btnCls}>{busy ? "Creating..." : "Create and open for payment"}</button>
      </div>
    </form>
  );
}
