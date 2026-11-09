"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { btnGhostCls } from "@/lib/ui";

type Reset = { tempPassword: string; fullName: string; email: string; phone: string };

export default function ResetPassword({ memberId }: { memberId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [r, setR] = useState<Reset | null>(null);

  async function go() {
    if (!window.confirm("Reset this person's password? Their old password stops working.")) return;
    setBusy(true);
    setError("");
    try {
      setR((await api(`/api/admin/members/${memberId}/reset-password`, "POST")) as Reset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  }

  const wa = r
    ? `https://wa.me/${r.phone}?text=${encodeURIComponent(
        `Hello ${r.fullName}, your SJA Kisii password was reset.\nWebsite: ${window.location.origin}\nLogin: ${r.email}\nTemporary password: ${r.tempPassword}\nYou will be asked to choose your own password when you sign in.`
      )}`
    : "";

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      {!r ? (
        <button disabled={busy} onClick={go} className={btnGhostCls}>
          {busy ? "Resetting..." : "Reset password"}
        </button>
      ) : (
        <div>
          <p className="text-xs text-warn">Shown once. They must choose a new password when they sign in.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white/10 px-3 py-1.5 font-mono text-sm">{r.tempPassword}</span>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-full bg-ok px-4 py-2 text-xs font-medium text-black">
              WhatsApp
            </a>
            <button onClick={() => navigator.clipboard?.writeText(r.tempPassword)} className={btnGhostCls}>
              Copy
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
    </div>
  );
}
