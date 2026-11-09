"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import AuthShell from "@/components/auth-shell";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function ForgotPasswordPage() {
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const enteredEmail = (f.get("email") as string) || "";
    setEmail(enteredEmail);
    try {
      const res = await api("/api/auth/forgot-password", "POST", { email: enteredEmail });
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a 6-digit verification code.">
      {msg ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
            {msg}
            <p className="mt-2 text-xs text-white/50">
              Check your inbox (and spam folder). In development, the code is also logged to the server terminal.
            </p>
          </div>
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className={`block text-center ${btnCls}`}
          >
            Enter 6-digit code →
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Email address</label>
            <input name="email" type="email" required placeholder="you@example.com" className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button disabled={busy} className={btnCls}>
            {busy ? "Sending code..." : "Send reset code"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-white/50">
        <Link href="/login" className="text-white underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
