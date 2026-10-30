"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnGhostCls, inputCls, labelCls } from "@/lib/ui";

export type InstrumentData = {
  id: string;
  name: string;
  type: string;
  serialNumber: string | null;
  condition: string | null;
  notes: string | null;
  status: "AVAILABLE" | "ISSUED" | "LOST" | "DAMAGED";
};

export default function InstrumentEdit({ inst }: { inst: InstrumentData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/band/instruments/${inst.id}`, "PUT", body);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    send({
      name: f.get("name"),
      type: f.get("type"),
      serialNumber: String(f.get("serialNumber") || ""),
      condition: String(f.get("condition") || ""),
      notes: String(f.get("notes") || ""),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setOpen((o) => !o)} className={btnGhostCls}>
          {open ? "Close" : "Edit details"}
        </button>
        {(inst.status === "DAMAGED" || inst.status === "LOST") && (
          <button
            disabled={busy}
            onClick={() => send({ restore: true })}
            className="rounded-full bg-ok px-5 py-2.5 text-xs font-medium text-black transition hover:brightness-110 disabled:opacity-50"
          >
            Mark available
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Name</label>
            <input name="name" required defaultValue={inst.name} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <input name="type" required defaultValue={inst.type} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Serial number</label>
            <input name="serialNumber" defaultValue={inst.serialNumber ?? ""} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Condition</label>
            <input name="condition" defaultValue={inst.condition ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Notes</label>
            <input name="notes" defaultValue={inst.notes ?? ""} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <button
              disabled={busy}
              className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200 disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
