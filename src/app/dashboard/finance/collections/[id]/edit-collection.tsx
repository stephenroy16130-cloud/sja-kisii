"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

const local = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function EditCollection({
  id,
  title,
  description,
  amount,
  closesAt,
  locked,
}: {
  id: string;
  title: string;
  description: string;
  amount: number;
  closesAt: string | null;
  locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const closes = String(f.get("closesAt") || "");
    try {
      await api(`/api/collections/${id}`, "PUT", {
        title: f.get("title"),
        description: String(f.get("description") ?? ""),
        closesAt: closes ? new Date(closes).toISOString() : null,
        ...(locked ? {} : { amount: Number(f.get("amount")) }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhostCls}>
        Edit details
      </button>
    );
  }

  return (
    <form onSubmit={save} className="grid gap-4 rounded-3xl border border-white/10 bg-card p-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelCls}>What is the payment for?</label>
        <input name="title" required defaultValue={title} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Price per person (KES)</label>
        <input name="amount" type="number" min={1} step={1} defaultValue={amount} disabled={locked} className={`${inputCls} disabled:opacity-50`} />
        {locked && <p className="mt-1 text-xs text-white/40">Someone has paid, so the price is locked.</p>}
      </div>
      <div>
        <label className={labelCls}>Closes at (optional)</label>
        <input name="closesAt" type="datetime-local" defaultValue={local(closesAt)} className={inputCls} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Notes</label>
        <textarea name="description" rows={2} defaultValue={description} className={inputCls} />
      </div>
      {error && <p className="text-sm text-bad sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}
