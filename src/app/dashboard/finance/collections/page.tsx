import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { openState } from "@/lib/collections";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { can } from "@/lib/rbac";
import { kes } from "@/lib/store";
import CreateCollectionForm from "./create-collection-form";

export const dynamic = "force-dynamic";

const tone = {
  OPEN: "border-ok/50 text-ok",
  CLOSED: "border-white/20 text-white/50",
  EXPIRED: "border-warn/50 text-warn",
} as const;
const word = { OPEN: "Open", CLOSED: "Closed", EXPIRED: "Time ended" } as const;

export default async function CollectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "finance:manage")) redirect("/dashboard");

  const list = await db.collection.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const sums = list.length
    ? await db.transaction.groupBy({
        by: ["collectionId"],
        where: { collectionId: { in: list.map((c) => c.id) }, status: "SUCCESS" },
        _count: { _all: true },
        _sum: { amount: true },
      })
    : [];

  return (
    <div className="space-y-10">
      <div>
        <Link href="/dashboard/finance" className="text-sm text-white/50 hover:text-white">← Finance</Link>
        <h1 className="mt-3 text-3xl font-light tracking-tight">Payment activities</h1>
        <p className="mt-1 text-sm text-white/50">
          Create something members must pay for, set the price, and watch the payments arrive live.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-light">New activity</h2>
        <CreateCollectionForm />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-light">Activities ({list.length})</h2>
        {list.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">Nothing yet.</div>
        ) : (
          <div className="space-y-3">
            {list.map((c) => {
              const s = sums.find((x) => x.collectionId === c.id);
              const st = openState(c);
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/finance/collections/${c.id}`}
                  className="block rounded-2xl border border-white/10 bg-card p-5 transition hover:border-white/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-light">{c.title}</p>
                      <p className="mt-1 text-sm text-white/60">
                        {kes(c.amount)} each · {c.crewId ? crewName(c.crewId) : "All members"}
                        {c.closesAt ? ` · closes ${fmt(c.closesAt)}` : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${tone[st]}`}>
                      {word[st]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-white/60">
                    <span className="text-ok">{s?._count._all ?? 0} paid</span> ·{" "}
                    <span className="text-gold">{kes(Number(String(s?._sum.amount ?? 0)))}</span> collected
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
