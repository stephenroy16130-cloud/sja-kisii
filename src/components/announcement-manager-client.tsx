"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export type AnnItem = {
  id: string;
  title: string;
  text: string | null; // null when this announcement has no editable text
  amount: number | null;
  paid: number;
  crew: string;
};

function Row({ item }: { item: AnnItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/crew/announcements/${item.id}`, "PUT", {
        title: f.get("title"),
        ...(item.text !== null ? { text: String(f.get("text") ?? "") } : {}),
        ...(item.amount !== null && item.paid === 0 ? { amount: Number(f.get("amount")) } : {}),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.title}"? Replies to it are removed too.`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/crew/announcements/${item.id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">{item.title}</p>
          <p className="mt-1 text-xs text-white/40">
            {item.crew}
            {item.amount !== null ? ` · fee KES ${item.amount.toLocaleString("en-KE")}` : ""}
            {item.paid > 0 ? ` · ${item.paid} paid` : ""}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => setEditing(true)} className={btnGhostCls}>Edit</button>
            <button
              disabled={busy}
              onClick={remove}
              className="rounded-full border border-bad/50 px-4 py-2 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div>
            <label className={labelCls}>Title</label>
            <input name="title" required defaultValue={item.title} className={inputCls} />
          </div>
          {item.text !== null && (
            <div>
              <label className={labelCls}>Message</label>
              <textarea name="text" rows={4} defaultValue={item.text} className={inputCls} />
            </div>
          )}
          {item.amount !== null && (
            <div>
              <label className={labelCls}>Fee (KES)</label>
              <input
                name="amount"
                type="number"
                min={1}
                defaultValue={item.amount}
                disabled={item.paid > 0}
                className={`${inputCls} disabled:opacity-50`}
              />
              {item.paid > 0 && <p className="mt-1 text-xs text-white/40">Someone has paid, so the fee is locked.</p>}
            </div>
          )}
          {error && <p className="text-sm text-bad">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={busy}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className={btnGhostCls}>Cancel</button>
          </div>
        </form>
      )}
      {!editing && error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}

export default function AnnouncementManagerClient({ items }: { items: AnnItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <Row key={i.id} item={i} />
      ))}
    </div>
  );
}
