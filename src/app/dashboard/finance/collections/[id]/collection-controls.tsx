"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function CollectionControls({ id, isOpen }: { id: string; isOpen: boolean }) {
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

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={toggle} className={btnGhostCls}>
          {isOpen ? "Close payments" : "Reopen payments"}
        </button>
        <a
          href={`/api/collections/${id}/export`}
          className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
        >
          Download list (CSV)
        </a>
      </div>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
