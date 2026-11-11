import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { collectionLive, openState } from "@/lib/collections";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { kes } from "@/lib/store";
import CollectionControls from "./collection-controls";
import LivePayments from "./live-payments";

export const dynamic = "force-dynamic";

const tone = {
  OPEN: "border-ok/50 text-ok",
  CLOSED: "border-white/20 text-white/50",
  EXPIRED: "border-warn/50 text-warn",
} as const;
const word = { OPEN: "Open for payment", CLOSED: "Closed", EXPIRED: "Time ended" } as const;

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "finance:manage")) redirect("/dashboard");
  const { id } = await params;

  const c = await db.collection.findUnique({ where: { id } });
  if (!c) notFound();
  const live = await collectionLive(c);
  const st = openState(c);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/finance/collections" className="text-sm text-white/50 hover:text-white">← All activities</Link>

      <section className="vignette-dark rounded-3xl border border-white/10 p-7 md:p-10">
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${tone[st]}`}>{word[st]}</span>
        <h1 className="mt-4 text-3xl font-light tracking-tight md:text-4xl">{c.title}</h1>
        <p className="mt-3 text-xl text-gold">{kes(c.amount)} per person</p>
        <p className="mt-1 text-sm text-white/60">
          {c.crewId ? crewName(c.crewId) + " only" : "All members"}
          {c.closesAt ? ` · closes ${fmt(c.closesAt)}` : ""}
        </p>
        {c.description && <p className="font-copy mt-4 text-sm leading-relaxed text-white/70">{c.description}</p>}
      </section>

      <CollectionControls id={c.id} isOpen={c.isOpen} closed={st !== "OPEN"} archived={Boolean(c.archivedAt)} />
      <LivePayments id={c.id} initial={live} />
    </div>
  );
}
