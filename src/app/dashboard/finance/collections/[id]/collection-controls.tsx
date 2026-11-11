"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function CollectionControls({
  id,
  isOpen,
  closed,
  archived,
}: {
  id: string;
  isOpen: boolean;
  closed: boolean;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (isOpen && !window.confirm("Close this activity? Nobody will be able to pay until you reopen it.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/collections/${id}`, "PUT", { isOpen: !isOpen, ...(!isOpen ? { closesAt: null } : {}) });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  async function setArchived(next: boolean) {
    if (next && !window.confirm("Delete this activity? It disappears from your lists. The payments made stay on record and in your reports.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/collections/${id}`, "PUT", { archived: next });
      if (next) router.push("/dashboard/finance/collections");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  const csv = (
    <a
      href={`/api/collections/${id}/export`}
      className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
    >
      Download list (CSV)
    </a>
  );

  if (archived) {
    return (
      <div>
        <p className="mb-3 text-sm text-white/60">This activity is deleted. Its payments stay on record.</p>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => setArchived(false)} className={btnGhostCls}>
            Restore
          </button>
          {csv}
        </div>
        {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={toggle} className={btnGhostCls}>
          {isOpen ? "Close payments" : "Reopen payments"}
        </button>
        {csv}
        {closed && (
          <button
            disabled={busy}
            onClick={() => setArchived(true)}
            className="rounded-full border border-bad/50 px-5 py-2.5 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
          >
            Delete activity
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
