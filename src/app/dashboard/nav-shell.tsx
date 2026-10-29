"use client";
import Badge from "@/components/badge";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

type IconName = "approvals" | "people" | "meetings" | "account";
export type NavLink = { href: string; label: string; icon: IconName };
type Tab = { key: string; label: string; icon: IconName; href?: string };

function Icon({ name }: { name: IconName }) {
  const p = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  if (name === "approvals")
    return (
      <svg {...p}>
        <rect x="6" y="4" width="12" height="17" rx="2" />
        <path d="M9 4h6v2H9z" />
        <path d="m9.5 13 2 2 3.5-4" />
      </svg>
    );
  if (name === "meetings")
    return (
      <svg {...p}>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  if (name === "meetings")
    return (
      <svg {...p}>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  if (name === "people")
    return (
      <svg {...p}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17 14c2.2 0 4 1.8 4 4" />
      </svg>
    );
  return (
    <svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

export default function NavShell({
  links,
  name,
  role,
  crew,
}: {
  links: NavLink[];
  name: string;
  role: string;
  crew: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const homeActive = path === "/dashboard";

  const tabs: Tab[] = [
    ...links.map((l) => ({ key: l.href, label: l.label, icon: l.icon, href: l.href })),
    { key: "account", label: "Account", icon: "account" as IconName },
  ];
  const split = Math.ceil(tabs.length / 2);
  const left = tabs.slice(0, split);
  const right = tabs.slice(split);

  const renderTab = (t: Tab) => {
    const active = t.href ? isActive(t.href) : sheet;
    const cls = `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition ${
      active ? "text-gold" : "text-white/45"
    }`;
    const inner = (
      <>
        <Icon name={t.icon} />
        <span>{t.label}</span>
      </>
    );
    return t.href ? (
      <Link key={t.key} href={t.href} onClick={() => setSheet(false)} className={cls}>
        {inner}
      </Link>
    ) : (
      <button key={t.key} onClick={() => setSheet((s) => !s)} className={cls}>
        {inner}
      </button>
    );
  };

  const brand = (
    <Link href="/dashboard" className="flex items-center gap-3">
      <Badge size={40} />
      <span className="text-[11px] uppercase leading-tight tracking-[0.2em] text-white/80">
        St. John Ambulance
        <br />
        Kisii University
      </span>
    </Link>
  );

  const desktopLinks = [{ href: "/dashboard", label: "Overview" }, ...links];

  return (
    <>
      {/* Large screens: panel on the right */}
      <aside className="hidden border-l border-white/10 bg-black text-white lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:flex lg:w-72 lg:flex-col lg:p-8">
        {brand}
        <nav className="mt-14 flex-1 space-y-2">
          {desktopLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-full px-5 py-2.5 text-sm transition ${
                isActive(l.href) ? "bg-white font-medium text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-6">
          <p className="text-sm font-medium">{name}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/50">{role}</p>
          {crew && <p className="mb-5 mt-1 text-sm text-white/60">{crew}</p>}
          <button
            onClick={logout}
            className="mt-4 rounded-full border border-white/30 px-5 py-2.5 text-xs uppercase tracking-[0.18em] transition hover:bg-white hover:text-black"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Phones: top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-black/90 px-4 py-4 backdrop-blur lg:hidden">
        {brand}
        <button
          onClick={() => setSheet(true)}
          aria-label="Account"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15"
        >
          <Icon name="account" />
        </button>
      </header>

      {/* Phones: account sheet */}
      {sheet && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSheet(false)}>
          <div
            className="absolute inset-x-3 bottom-28 rounded-3xl border border-white/10 bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-medium">{name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/50">{role}</p>
            {crew && <p className="mt-1 text-sm text-white/60">{crew}</p>}
            <button
              onClick={logout}
              className="mt-5 w-full rounded-full border border-white/30 py-3 text-sm transition hover:bg-white hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Phones: floating bottom bar with raised Home button */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-white/10 bg-[#0d0d0d]/95 backdrop-blur lg:hidden">
        <div className="flex items-center px-2">
          {left.map(renderTab)}
          <Link
            href="/dashboard"
            onClick={() => setSheet(false)}
            aria-label="Home"
            className={`mx-2 -mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl leading-none text-black ring-4 ring-black transition ${
              homeActive ? "shadow-[0_0_28px_rgba(212,175,90,0.5)]" : ""
            }`}
          >
            <Badge size={44} bare />
          </Link>
          {right.map(renderTab)}
        </div>
      </nav>
    </>
  );
}
