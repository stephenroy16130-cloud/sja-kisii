"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function ArchiveButton({
  meetingId,
  title,
  archived,
}: {
  meetingId: string;
  title: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(next: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/meetings/${meetingId}/archive`, "POST", { archived: next });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  if (archived) {
    return (
      <button disabled={busy} onClick={() => run(false)} className={btnGhostCls}>
        {busy ? "Restoring..." : "Restore"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-bad/50 px-4 py-2 text-xs text-bad transition hover:bg-bad hover:text-black"
      >
        Delete
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-card p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-light">Are you sure?</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              <span className="text-white">{title}</span> and its attendance records will be removed from the
              dashboard. Nothing is permanently erased: the records stay in the database for historical analytics,
              and you can restore the meeting later from the Archived list.
            </p>
            {error && <p className="mt-3 text-sm text-bad">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button disabled={busy} onClick={() => setOpen(false)} className={btnGhostCls}>
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={() => run(true)}
                className="rounded-full bg-bad px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
