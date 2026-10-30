"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export default function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/documents/${id}`, "DELETE");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        disabled={busy}
        onClick={remove}
        className="rounded-full border border-bad/50 px-4 py-2 text-xs text-bad transition hover:bg-bad hover:text-black disabled:opacity-50"
      >
        {busy ? "Deleting..." : "Delete"}
      </button>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
