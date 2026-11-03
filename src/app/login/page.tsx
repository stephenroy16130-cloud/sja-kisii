"use client";

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import AuthShell from "@/components/auth-shell";
import PasswordInput from "@/components/password-input";
import { api } from "@/lib/client";
import { btnCls, inputCls, labelCls } from "@/lib/ui";

// After signing in, go back to the page the member was trying to reach (for example a QR check-in)
function nextUrl() {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);

  useEffect(() => {
    setBio(browserSupportsWebAuthn());
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/auth/login", "POST", { identifier: f.get("identifier"), password: f.get("password") });
      router.push(nextUrl());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  async function biometric() {
    setError("");
    setBusy(true);
    try {
      const options = await api("/api/passkeys/login/options", "POST");
      const response = await startAuthentication({ optionsJSON: options });
      await api("/api/passkeys/login/verify", "POST", { response });
      router.push(nextUrl());
      router.refresh();
    } catch (err) {
      const n = (err as { name?: string }).name;
      setError(
        n === "NotAllowedError"
          ? "Cancelled, or no saved sign-in was found on this device. Use your password, then add this device in My profile."
          : err instanceof Error
            ? err.message
            : "Something went wrong"
      );
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your username or email.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Username or email</label>
          <input name="identifier" required autoComplete="username webauthn" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <PasswordInput name="password" autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={busy} className={btnCls}>
          {busy ? "Please wait..." : "Sign in"}
        </button>
      </form>

      {bio && (
        <div className="mt-5">
          <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/30">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={biometric}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-white/30 px-5 py-3.5 text-sm text-white transition hover:bg-white hover:text-black disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 11c0 3-.5 5.5-2 8M8.5 20c1.5-2.5 2-5 2-8a1.5 1.5 0 0 1 3 0c0 3-.5 6-2 9M16.5 17c.6-1.7 1-3.5 1-5.5a5.5 5.5 0 0 0-11 0c0 1.2-.1 2.3-.4 3.4M5 9a8 8 0 0 1 14 0" />
            </svg>
            Sign in with fingerprint / face
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-between text-sm text-white/50">
        <Link href="/forgot-password" className="hover:text-white">Forgot password?</Link>
        <Link href="/register" className="hover:text-white">Create account</Link>
      </div>
    </AuthShell>
  );
}
