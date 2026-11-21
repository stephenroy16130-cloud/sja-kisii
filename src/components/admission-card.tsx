import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import AdmissionForm from "./admission-form";

export default async function AdmissionCard() {
  const user = await getCurrentUser();
  if (!user || user.isDeveloper) return null;
  const row = await db.user.findUnique({ where: { id: user.id }, select: { admissionNumber: true } });

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.25em] text-gold">Official details</p>
      <p className="mt-2 text-sm text-white/60">
        Your university admission number. It is private: only you and the DO Admin can see it. End it with the year as two digits, like SC211/1234/26.
      </p>
      <AdmissionForm initial={row?.admissionNumber ?? ""} />
    </section>
  );
}
