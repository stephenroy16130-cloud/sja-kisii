"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/auth-shell";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function ForgotPasswordPage() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/auth/forgot-password", "POST", { email: f.get("email") });
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      {msg ? (
        <div className="bg-card/10 p-4 text-sm">
          {msg}
          <p className="mt-2 text-xs text-white/50">In development the link is printed in the server terminal.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Email</label>
            <input name="email" type="email" required className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={busy} className={btnCls}>{busy ? "Sending..." : "Send reset link"}</button>
        </form>
      )}
      <p className="mt-6 text-sm text-white/50">
        <Link href="/login" className="text-white underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
