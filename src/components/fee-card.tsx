import { db } from "@/lib/db";
import { registrationFee } from "@/lib/mpesa";
import { kes } from "@/lib/store";
import PayButton from "./pay-button";

// Shows only to Active members who owe the registration fee
export default async function FeeCard({ userId }: { userId: string }) {
  const fee = await registrationFee();
  if (!fee) return null;

  const [paid, me] = await Promise.all([
    db.transaction.count({ where: { userId, purpose: "REGISTRATION_FEE", status: "SUCCESS" } }),
    db.user.findUnique({ where: { id: userId }, select: { phone: true } }),
  ]);
  if (paid > 0) return null;

  return (
    <section className="rounded-3xl border border-gold/40 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Registration fee</p>
      <p className="mt-2 text-3xl font-light">{kes(fee)}</p>
      <p className="mt-1 text-sm text-white/60">One-time fee for joining the division. Pay by M-Pesa.</p>
      <div className="mt-4">
        <PayButton target={{ kind: "registration" }} amount={kes(fee)} phone={me?.phone ?? ""} />
      </div>
    </section>
  );
}
