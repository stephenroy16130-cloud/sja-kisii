"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Avatar from "@/components/avatar";
import Badge from "@/components/badge";
import Bell from "@/components/bell";
import EmergencyLine from "@/components/emergency-line";
import { api } from "@/lib/client";
import { detachPushFromServer } from "@/lib/push-client";

type IconName =
  | "home" | "approvals" | "people" | "meetings" | "fieldops" | "training" | "store" | "pay" | "band"
  | "crew" | "profile" | "members" | "articles" | "documents" | "finance" | "attendance"
  | "analytics" | "scan" | "bell" | "more";
export type NavLink = { href: string; label: string; icon: IconName };

// Phone bar: Attendance, Meetings, Home (badge), Shop, More
const BAR = ["/dashboard/attendance", "/dashboard/meetings", "/dashboard/store"];

// Desktop panel: links grouped under small headings so more fit on screen
const GROUPS: { name: string; hrefs: string[] }[] = [
  { name: "Home", hrefs: ["/dashboard"] },
  { name: "Activities", hrefs: ["/dashboard/meetings", "/dashboard/fieldops", "/dashboard/training", "/dashboard/band", "/dashboard/crew"] },
  { name: "My record", hrefs: ["/dashboard/notifications", "/dashboard/attendance", "/dashboard/scan", "/dashboard/profile"] },
  { name: "Money", hrefs: ["/dashboard/store", "/dashboard/pay", "/dashboard/finance"] },
  { name: "Information", hrefs: ["/dashboard/articles", "/dashboard/documents"] },
  { name: "Management", hrefs: ["/dashboard/approvals", "/dashboard/people", "/dashboard/members", "/dashboard/analytics"] },
];

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round",
  } as const;
  switch (name) {
    case "home":
      return (<svg {...p}><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></svg>);
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
    case "pay":
      return (<svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.5v9M9.5 10c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7-1 1.4-2.5 1.6-2.5.7-2.5 1.7 1 1.7 2.5 1.7 2.5-.7 2.5-1.6" /></svg>);
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
    case "finance":
      return (<svg {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9v.01M18 15v.01" /></svg>);
    case "attendance":
      return (<svg {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17" /></svg>);
    case "analytics":
      return (<svg {...p}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>);
    case "scan":
      return (<svg {...p}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" /></svg>);
    case "bell":
      return (<svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>);
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
    await detachPushFromServer();
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  const [att, meet, shop] = BAR.map((h) => links.find((l) => l.href === h));
  const barLinks = [att, meet, shop].filter((l): l is NavLink => Boolean(l));
  const extra = links.filter((l) => !barLinks.includes(l));
  const moreActive = sheet || extra.some((l) => isActive(l.href));
  const homeActive = path === "/dashboard";

  // Desktop groups
  const all: NavLink[] = [{ href: "/dashboard", label: "Overview", icon: "home" }, ...links];
  const used = new Set<string>();
  const groups = GROUPS.map((g) => {
    const items = g.hrefs.map((h) => all.find((l) => l.href === h)).filter((l): l is NavLink => Boolean(l));
    items.forEach((i) => used.add(i.href));
    return { name: g.name, items };
  }).filter((g) => g.items.length > 0);
  const rest = all.filter((l) => !used.has(l.href));
  if (rest.length) groups.push({ name: "More", items: rest });

  const tabCls = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] ${active ? "text-gold" : "text-white/45"}`;
  const tab = (l: NavLink) => (
    <Link key={l.href} href={l.href} className={tabCls(isActive(l.href))}>
      <Icon name={l.icon} />
      <span>{l.label}</span>
    </Link>
  );

  const brand = (size: number) => (
    <Link href="/dashboard" className="flex items-center gap-3">
      <Badge size={size} />
      <span className="text-[11px] uppercase leading-tight tracking-[0.2em] text-white/80">
        St. John Ambulance
        <br />
        Kisii University
      </span>
    </Link>
  );

  return (
    <>
      {/* Large screens: a compact right panel with grouped links */}
      <aside className="hidden border-l border-white/10 bg-black text-white lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:flex lg:w-72 lg:flex-col">
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between gap-2">
            {brand(36)}
            <Bell />
          </div>
          <EmergencyLine slim className="mt-4" />
        </div>

        <nav className="nav-scroll min-h-0 flex-1 overflow-y-scroll px-3 pb-3">
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <p className="px-3 pb-1 pt-3 text-[10px] uppercase tracking-[0.2em] text-white/30">{g.name}</p>
              {g.items.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] transition ${
                    isActive(l.href) ? "bg-white font-medium text-black" : "text-white/65 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon name={l.icon} size={16} />
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 p-3">
          <Avatar name={name} src={photo} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide">{name}</p>
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-white/45">
              {crew ? `${crew} · ${role}` : role}
            </p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white hover:text-black"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Phones: top bar with the emergency number */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-black px-4 py-4 lg:hidden">
        {brand(40)}
        <div className="flex items-center gap-2">
          <Bell />
          <EmergencyLine compact />
        </div>
      </header>

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

      {/* Phones: Attendance, Meetings, Home (badge), Shop, More */}
      <nav className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-white/10 bg-[#0d0d0d] lg:hidden">
        <div className="flex items-center px-2">
          {att && tab(att)}
          {meet && tab(meet)}
          <Link href="/dashboard" className={tabCls(homeActive)}>
            <span className={`rounded-full ${homeActive ? "ring-2 ring-gold" : ""}`}>
              <Badge size={26} />
            </span>
            <span>Home</span>
          </Link>
          {shop && tab(shop)}
          <button onClick={() => setSheet((s) => !s)} className={tabCls(moreActive)}>
            <Icon name="more" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
