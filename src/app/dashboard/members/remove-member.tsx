"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export default function RemoveMember({
  memberId,
  name,
  onRemoved,
}: {
  memberId: string;
  name: string;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/members/${memberId}/remove`, "POST", { confirmName: typed });
      onRemoved();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-white/10 pt-4">
        <button onClick={() => setOpen(true)} className="text-xs text-bad underline">
          Remove this member...
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-bad/40 p-4">
      <p className="text-sm text-bad">Remove {name} permanently</p>
      <p className="mt-2 text-xs leading-relaxed text-white/60">
        This deletes their account and all their personal records: attendance, apologies, orders and payments, RSVPs,
        photos and devices. Meetings, articles, documents and announcements they created stay and move to you. This
        cannot be undone. Download the member report and the Finance CSV first if you need them.
      </p>
      <label className={`${labelCls} mt-4`}>Type their full name to confirm</label>
      <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={name} className={inputCls} />
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          disabled={busy || typed.trim().length === 0}
          onClick={remove}
          className="rounded-full bg-bad px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-40"
        >
          {busy ? "Removing..." : "Delete permanently"}
        </button>
        <button disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>
          Cancel
        </button>
      </div>
    </div>
  );
}
