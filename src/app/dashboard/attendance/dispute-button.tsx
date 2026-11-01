"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export default function DisputeButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/attendance/${id}/dispute`, "POST", { reason: f.get("reason") });
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
        Dispute
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 w-full space-y-3">
      <div>
        <label className={labelCls}>Why were you present?</label>
        <textarea name="reason" required minLength={5} maxLength={500} rows={3} className={inputCls} />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={busy}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send dispute"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>
          Cancel
        </button>
      </div>
    </form>
  );
}
