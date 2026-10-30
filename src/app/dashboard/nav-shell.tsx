"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/avatar";
import Badge from "@/components/badge";
import { api } from "@/lib/client";

type IconName =
  | "approvals" | "people" | "meetings" | "fieldops" | "training" | "store"
  | "band" | "crew" | "profile" | "members" | "articles" | "documents" | "more";
export type NavLink = { href: string; label: string; icon: IconName };

// Phone bar order: Meetings, Crew and Store first. Everything else lives under "More".
const BAR_PRIORITY = ["/dashboard/meetings", "/dashboard/crew", "/dashboard/store"];

function Icon({ name }: { name: IconName }) {
  const p = {
    width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
  } as const;
  switch (name) {
    case "approvals":
      return (<svg {...p}><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v2H9z" /><path d="m9.5 13 2 2 3.5-4" /></svg>);
    case "people":
      return (<svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.2 0 4 1.8 4 4" /></svg>);
    case "meetings":
      return (<svg {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>);
    case "fieldops":
      return (<svg {...p}><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></svg>);
    case "training":
      return (<svg {...p}><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5C4.7 20 4 19.3 4 18.5z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H13v16h5.5c.8 0 1.5-.7 1.5-1.5z" /></svg>);
    case "store":
      return (<svg {...p}><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>);
    case "band":
      return (<svg {...p}><ellipse cx="12" cy="10" rx="7" ry="3" /><path d="M5 10v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /><path d="M9 3l3 6M15 3l-3 6" /></svg>);
    case "crew":
      return (<svg {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>);
    case "profile":
      return (<svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>);
    case "members":
      return (<svg {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>);
    case "articles":
      return (<svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M9 9h6M9 13h6" /></svg>);
    case "documents":
      return (<svg {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M10 13h6M10 17h6" /></svg>);
    default:
      return (<svg {...p}><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></svg>);
  }
}

export default function NavShell({
  links,
  name,
  role,
  crew,
  photo,
}: {
  links: NavLink[];
  name: string;
  role: string;
  crew: string;
  photo: string | null;
}) {
  const path = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState(false);

  // Close the sheet after navigating, and stop the page scrolling behind it while it is open
  useEffect(() => {
    setSheet(false);
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  async function logout() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  const bar: NavLink[] = BAR_PRIORITY.map((h) => links.find((l) => l.href === h)).filter((l): l is NavLink => Boolean(l));
  for (const l of links) {
    if (bar.length >= 3) break;
    if (!bar.includes(l)) bar.push(l);
  }
  const extra = links.filter((l) => !bar.includes(l));
  const left = bar.slice(0, 2);
  const right = bar.slice(2);
  const moreActive = sheet || extra.some((l) => isActive(l.href));

  const tabCls = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] ${active ? "text-gold" : "text-white/45"}`;

  const renderTab = (l: NavLink) => (
    <Link key={l.href} href={l.href} className={tabCls(isActive(l.href))}>
      <Icon name={l.icon} />
      <span>{l.label}</span>
    </Link>
  );

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

  const desktopLinks: NavLink[] = [{ href: "/dashboard", label: "Overview", icon: "more" }, ...links];

  return (
    <>
      {/* Large screens: panel on the right */}
      <aside className="hidden border-l border-white/10 bg-black text-white lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:flex lg:w-72 lg:flex-col lg:p-8">
        {brand}
        <nav className="mt-10 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {desktopLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-full px-5 py-2.5 text-sm ${
                isActive(l.href) ? "bg-white font-medium text-black" : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-6">
          <div className="flex items-center gap-3">
            <Avatar name={name} src={photo} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium uppercase tracking-wide">{name}</p>
              <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.18em] text-white/50">{role}</p>
            </div>
          </div>
          {crew && <p className="mt-2 text-sm text-white/60">{crew}</p>}
          <button
            onClick={logout}
            className="mt-5 rounded-full border border-white/30 px-5 py-2.5 text-xs uppercase tracking-[0.18em] hover:bg-white hover:text-black"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Phones: top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-black px-4 py-4 lg:hidden">{brand}</header>

      {/* Phones: More sheet */}
      {sheet && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSheet(false)}>
          <div
            className="absolute inset-x-3 bottom-24 max-h-[70vh] overflow-y-auto rounded-3xl border border-white/10 bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {extra.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-2">
                {extra.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                      isActive(l.href) ? "border-gold/60 text-gold" : "border-white/10 text-white/80"
                    }`}
                  >
                    <Icon name={l.icon} />
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Avatar name={name} src={photo} size={44} />
              <div className="min-w-0">
                <p className="truncate text-lg font-medium uppercase tracking-wide">{name}</p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.18em] text-white/50">{role}</p>
              </div>
            </div>
            {crew && <p className="mt-2 text-sm text-white/60">{crew}</p>}
            <button
              onClick={logout}
              className="mt-5 w-full rounded-full border border-white/30 py-3 text-sm hover:bg-white hover:text-black"
            >
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Phones: bottom bar with a small badge pinned in the centre */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] lg:hidden">
        <div className="flex items-center px-2">
          {left.map(renderTab)}
          <Link
            href="/dashboard"
            aria-label="Home"
            className={`mx-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              path === "/dashboard" ? "ring-2 ring-gold" : ""
            }`}
          >
            <Badge size={30} />
          </Link>
          {right.map(renderTab)}
          <button onClick={() => setSheet((s) => !s)} className={tabCls(moreActive)}>
            <Icon name="more" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
