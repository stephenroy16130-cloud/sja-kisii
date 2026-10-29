"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

export default function RegistrationToggle({ initialOpen }: { initialOpen: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const res = await api("/api/admin/settings/registration", "PUT", { open: !open });
      setOpen(res.registrationOpen);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setBusy(false);
  }

  return (
    <div>
      <p className="text-sm text-white/50">
        Public registration is <span className="font-medium text-white">{open ? "OPEN" : "CLOSED"}</span>.
      </p>
      <button onClick={toggle} disabled={busy} className={`${btnGhostCls} mt-3`}>
        {open ? "Close registration" : "Open registration"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
