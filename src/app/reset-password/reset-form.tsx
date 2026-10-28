"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function ResetForm({ token }: { token: string }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await api("/api/auth/reset-password", "POST", { token, password: f.get("password") });
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (msg)
    return (
      <div className="border border-black p-4 text-sm">
        {msg} <Link href="/login" className="underline">Sign in</Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>New password</label>
        <input name="password" type="password" required className={inputCls} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={busy} className={btnCls}>{busy ? "Saving..." : "Update password"}</button>
    </form>
  );
}
