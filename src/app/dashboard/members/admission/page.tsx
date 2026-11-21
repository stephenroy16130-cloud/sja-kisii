import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import AdmissionTable from "./admission-table";

export const dynamic = "force-dynamic";

export default async function AdmissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "user:manage_accounts")) redirect("/dashboard");

  const rows = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false },
    orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, crewId: true, admissionNumber: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/members" className="text-sm text-white/50 hover:text-white">← Members</Link>
        <h1 className="mt-3 text-3xl font-light tracking-tight">Admission numbers</h1>
        <p className="mt-1 text-sm text-white/50">
          Every member in one list. Fill the gaps, correct mistakes, and download the list. Numbers end with the year as
          two digits, like SC211/1234/26.
        </p>
      </div>
      <AdmissionTable
        rows={rows.map((r) => ({
          id: r.id,
          name: r.fullName,
          crewId: r.crewId,
          crew: r.crewId ? crewName(r.crewId) : "No crew",
          admission: r.admissionNumber ?? "",
        }))}
      />
    </div>
  );
}
