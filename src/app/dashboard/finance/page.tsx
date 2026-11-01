import type { TransactionPurpose } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/meetings";
import { PURPOSE_WORD, registrationFee, TX_TONE, TX_WORD } from "@/lib/mpesa";
import { can } from "@/lib/rbac";
import { kes } from "@/lib/store";
import FeeForm from "./fee-form";

export const dynamic = "force-dynamic";

const card = "rounded-3xl border border-white/10 bg-card p-6";
const chip = "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em]";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "finance:manage")) redirect("/dashboard");

  const [fee, txs, totals, members, paidRows, pending] = await Promise.all([
    registrationFee(),
    db.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { fullName: true } }, order: { select: { status: true } } },
    }),
    db.transaction.groupBy({ by: ["purpose"], where: { status: "SUCCESS" }, _sum: { amount: true }, _count: { _all: true } }),
    db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    db.transaction.findMany({ where: { purpose: "REGISTRATION_FEE", status: "SUCCESS" }, select: { userId: true } }),
    db.transaction.count({ where: { status: "PENDING", createdAt: { gte: new Date(Date.now() - 3_600_000) } } }),
  ]);

  const money = (p?: TransactionPurpose) =>
    totals.filter((t) => !p || t.purpose === p).reduce((s, t) => s + Number(String(t._sum.amount ?? 0)), 0);
  const paid = new Set(paidRows.map((r) => r.userId));
  const unpaid = members.filter((m) => !paid.has(m.id));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Finance</h1>
          <p className="mt-1 text-sm text-white/50">M-Pesa payments, fees and the store.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/store/manage"
            className="rounded-full border border-gold/60 px-5 py-2.5 text-xs uppercase tracking-[0.15em] text-gold transition hover:bg-gold hover:text-black"
          >
            Store orders
          </Link>
          <a
            href="/api/finance/transactions/export"
            className="rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
          >
            Download CSV
          </a>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={`${card} col-span-2 md:col-span-1`}>
          <p className="text-sm text-white/50">Total collected</p>
          <p className="mt-2 text-3xl font-light text-gold">{kes(money())}</p>
          <p className="mt-1 text-xs text-white/40">{pending > 0 ? `${pending} payment(s) in progress` : "Nothing in progress"}</p>
        </div>
        {(Object.keys(PURPOSE_WORD) as TransactionPurpose[]).map((p) => (
          <div key={p} className={card}>
            <p className="text-sm text-white/50">{PURPOSE_WORD[p]}</p>
            <p className="mt-2 text-2xl font-light">{kes(money(p))}</p>
            <p className="mt-1 text-xs text-white/40">{totals.find((t) => t.purpose === p)?._count._all ?? 0} payments</p>
          </div>
        ))}
      </section>

      <section className={card}>
        <h2 className="text-xl font-light">Registration fee</h2>
        <p className="mb-5 mt-1 text-sm text-white/50">
          Active members who have not paid see a pay card on their dashboard. Set 0 to charge nothing.
        </p>
        <FeeForm fee={fee} />
        {fee > 0 && (
          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-sm">
              <span className="text-ok">{members.length - unpaid.length} paid</span>
              <span className="text-white/40"> · </span>
              <span className="text-warn">{unpaid.length} not yet paid</span>
            </p>
            {unpaid.length > 0 && (
              <details className="mt-3 text-sm text-white/60">
                <summary className="cursor-pointer hover:text-white">Who has not paid</summary>
                <ul className="mt-2 space-y-1 uppercase tracking-wide">
                  {unpaid.slice(0, 300).map((m) => (
                    <li key={m.id}>{m.fullName}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-light">Transactions</h2>
        {txs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">No payments yet.</div>
        ) : (
          <div className="space-y-3">
            {txs.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/10 bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-wide">{t.user.fullName}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {PURPOSE_WORD[t.purpose]} · {fmt(t.createdAt)} · {t.phone}
                    </p>
                    {t.mpesaReceipt ? (
                      <p className="mt-1 font-mono text-xs text-white/70">{t.mpesaReceipt}</p>
                    ) : t.status === "SUCCESS" ? (
                      <p className="mt-1 text-xs text-white/40">Confirmed by status check, no M-Pesa code yet</p>
                    ) : null}
                    {(t.status === "FAILED" || t.status === "CANCELLED") && t.resultDesc && (
                      <p className="mt-1 text-xs text-white/40">{t.resultDesc}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gold">{kes(t.amount)}</p>
                    <span className={`${chip} ${TX_TONE[t.status]}`}>{TX_WORD[t.status]}</span>
                  </div>
                </div>
                {t.status === "SUCCESS" && t.order?.status === "CANCELLED" && (
                  <p className="mt-3 text-xs text-warn">
                    This order was cancelled after payment. Refund the member outside the system.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
