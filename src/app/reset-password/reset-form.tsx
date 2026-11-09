"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import PasswordInput from "@/components/password-input";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

export default function ResetForm({
  initialEmail = "",
  initialCode = "",
}: {
  initialEmail?: string;
  initialCode?: string;
}) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    const email = (f.get("email") as string)?.trim();
    const code = (f.get("code") as string)?.trim();
    const password = f.get("password") as string;
    const confirmPassword = f.get("confirmPassword") as string;

    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      const res = await api("/api/auth/reset-password", "POST", { email, code, password });
      setMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setBusy(false);
  }

  if (msg)
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {msg}
        </div>
        <Link href="/login" className={`block text-center ${btnCls}`}>
          Go to Sign In →
        </Link>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Email address</label>
        <input
          name="email"
          type="email"
          defaultValue={initialEmail}
          required
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>

      <div>
        <label className={labelCls}>6-Digit Verification Code</label>
        <input
          name="code"
          type="text"
          maxLength={6}
          pattern="[0-9]{6}"
          inputMode="numeric"
          defaultValue={initialCode}
          required
          placeholder="123456"
          className={`${inputCls} text-center font-mono text-lg tracking-[0.3em]`}
        />
      </div>

      <div>
        <label className={labelCls}>New password</label>
        <PasswordInput name="password" placeholder="Min 8 chars, 1 uppercase, 1 number" />
      </div>

      <div>
        <label className={labelCls}>Confirm new password</label>
        <PasswordInput name="confirmPassword" placeholder="Re-enter new password" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button disabled={busy} className={btnCls}>
        {busy ? "Updating..." : "Update password"}
      </button>

      <p className="mt-4 text-center text-xs text-white/50">
        Didn&apos;t get a code?{" "}
        <Link href="/forgot-password" className="text-white underline">
          Request a new one
        </Link>
      </p>
    </form>
  );
}
