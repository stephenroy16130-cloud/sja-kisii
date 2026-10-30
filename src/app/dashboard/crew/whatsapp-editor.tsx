"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls } from "@/lib/ui";

export default function WhatsappEditor({ crewId, link }: { crewId: number; link: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/crew/whatsapp", "PUT", { crewId, link: String(f.get("link") || "") });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className={btnGhostCls}>
        {open ? "Close" : link ? "Change link" : "Add link"}
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-3 flex flex-wrap gap-2">
          <input
            name="link"
            defaultValue={link ?? ""}
            placeholder="https://chat.whatsapp.com/..."
            className={`${inputCls} min-w-0 flex-1`}
          />
          <button
            disabled={busy}
            className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
