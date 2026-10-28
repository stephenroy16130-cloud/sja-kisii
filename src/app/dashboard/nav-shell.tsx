"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export type NavLink = { href: string; label: string };

export default function NavShell({
  links,
  name,
  role,
}: {
  links: NavLink[];
  name: string;
  role: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const linkCls = (active: boolean) =>
    `block border-l py-2 pl-4 text-xs uppercase tracking-[0.22em] transition ${
      active ? "border-[var(--accent)] text-white" : "border-transparent text-white/50 hover:text-white"
    }`;
  const outBtn =
    "border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white transition hover:bg-white hover:text-black";

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="text-2xl leading-none">✳</span>
      <span className="text-[11px] uppercase leading-tight tracking-[0.2em] text-white/80">
        St. John Ambulance
        <br />
        Kisii University
      </span>
    </Link>
  );

  return (
    <>
      {/* Large screens: fixed panel on the right */}
      <aside className="hidden bg-black text-white lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:flex lg:w-72 lg:flex-col lg:p-8">
        {brand}
        <nav className="mt-14 flex-1 space-y-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls(isActive(l.href))}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/15 pt-6">
          <p className="text-sm font-medium">{name}</p>
          <p className="mb-5 mt-1 text-[11px] uppercase tracking-[0.18em] text-white/50">{role}</p>
          <button onClick={logout} className={outBtn}>Log out</button>
        </div>
      </aside>

      {/* Small screens: top bar with hamburger */}
      <header className="sticky top-0 z-30 bg-black text-white lg:hidden">
        <div className="flex items-center justify-between px-4 py-4">
          {brand}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5"
          >
            <span className="h-px w-6 bg-white" />
            <span className="h-px w-6 bg-white" />
            <span className="h-px w-6 bg-white" />
          </button>
        </div>
        {open && (
          <div className="space-y-2 border-t border-white/15 px-4 pb-5 pt-4">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={linkCls(isActive(l.href))}>
                {l.label}
              </Link>
            ))}
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-white/60">{name}</span>
              <button onClick={logout} className={outBtn}>Log out</button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
