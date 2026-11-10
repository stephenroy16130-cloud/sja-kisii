import { redirect } from "next/navigation";
import ContextualTooltip from "@/components/contextual-tooltip";
import PayButton from "@/components/pay-button";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { kes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const now = new Date();

  const [open, me, history] = await Promise.all([
    db.collection.findMany({
      where: {
        isOpen: true,
        AND: [
          { OR: [{ closesAt: null }, { closesAt: { gt: now } }] },
          { OR: [{ crewId: null }, ...(user.crewId ? [{ crewId: user.crewId }] : [])] },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
    db.transaction.findMany({
      where: { userId: user.id, purpose: "COLLECTION", status: "SUCCESS" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const paid = new Map(history.map((h) => [h.collectionId, h]));
  const titles = history.length
    ? await db.collection.findMany({
        where: { id: { in: history.map((h) => h.collectionId).filter((x): x is string => Boolean(x)) } },
        select: { id: true, title: true },
      })
    : [];
  const titleOf = new Map(titles.map((t) => [t.id, t.title]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Pay</h1>
        <p className="mt-1 text-sm text-white/50">Activities DO Finance has opened for payment. Pay with M-Pesa.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-light">Open for payment</h2>
          <ContextualTooltip
            id="hasSeenPayTooltip"
            title="Instant M-Pesa Verification"
            position="bottom"
            align="end"
            content="Pay division dues, event collections, and registration with M-Pesa. Once the STK push completes on your phone, receipts are logged automatically."
          >
            <span className="cursor-pointer text-xs uppercase tracking-[0.18em] text-gold/80 hover:text-gold">
              Payment Guide ⓘ
            </span>
          </ContextualTooltip>
        </div>
        {open.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
            Nothing is open for payment right now.
          </div>
        ) : (
          <div className="space-y-3">
            {open.map((c) => {
              const done = paid.get(c.id);
              return (
                <div key={c.id} className="rounded-3xl border border-white/10 bg-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-light">{c.title}</p>
                      {c.description && <p className="font-copy mt-1 text-sm text-white/60">{c.description}</p>}
                      <p className="mt-2 text-xs text-white/40">
                        {c.crewId ? `For ${crewName(c.crewId)}` : "For all members"}
                        {c.closesAt ? ` · closes ${fmt(c.closesAt)}` : ""}
                      </p>
                    </div>
                    <p className="text-xl text-gold">{kes(c.amount)}</p>
                  </div>
                  <div className="mt-4">
                    {done ? (
                      <p className="text-sm text-ok">
                        Paid{done.mpesaReceipt ? ` · ${done.mpesaReceipt}` : ""}. Thank you.
                      </p>
                    ) : (
                      <PayButton target={{ kind: "collection", collectionId: c.id }} amount={kes(c.amount)} phone={me?.phone ?? ""} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-light">My payments</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card p-4 text-sm">
                <div>
                  <p>{titleOf.get(h.collectionId ?? "") ?? "Payment"}</p>
                  <p className="mt-1 text-xs text-white/40">
                    {fmt(h.updatedAt)}
                    {h.mpesaReceipt ? ` · ${h.mpesaReceipt}` : ""}
                  </p>
                </div>
                <span className="text-gold">{kes(h.amount)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
