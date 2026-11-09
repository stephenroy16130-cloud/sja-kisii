import Link from "next/link";

export default function ChangePasswordCard() {
  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Password</p>
      <p className="mt-2 text-sm text-white/60">Change the password you use to sign in.</p>
      <Link
        href="/change-password"
        className="mt-4 inline-block rounded-full border border-white/40 px-5 py-2.5 text-xs transition hover:bg-white hover:text-black"
      >
        Change password
      </Link>
    </section>
  );
}
