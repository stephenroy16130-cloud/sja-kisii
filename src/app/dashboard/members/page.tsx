import Link from "next/link";
import { redirect } from "next/navigation";
import ReportButton from "@/components/report-button";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { socialPhoto } from "@/lib/profile";
import { can } from "@/lib/rbac";
import AddMembers from "./add-members";
import MasterList, { type MemberRow } from "./master-list";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "user:manage_accounts")) redirect("/dashboard");

  const [rows, waiting] = await Promise.all([
    db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false },
      orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
      select: {
        id: true, fullName: true, preferredName: true, socialPhotoAt: true, crewId: true,
        titles: true, isSuperintendent: true,
        dateOfBirth: true, gender: true, idType: true, idNumber: true,
      },
    }),
    db.user.findMany({
      where: { status: { in: ["PENDING_ADMIN", "PENDING_CREW"] }, isDeveloper: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true, crewId: true, status: true },
    }),
  ]);

  // Only non-sensitive fields are sent to the browser. Official details load on click.
  const members: MemberRow[] = rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    nickname: r.preferredName,
    photo: socialPhoto(r),
    crewId: r.crewId,
    titles: r.isSuperintendent ? ["SUPERINTENDENT", ...r.titles] : r.titles,
    complete: Boolean(r.dateOfBirth && r.gender && r.idType && r.idNumber),
  }));
  const incomplete = members.filter((m) => !m.complete).length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-white/50">
            {members.length} active members · {incomplete} with an incomplete official profile. Click a name to open
            their record.
          </p>
        </div>
        <ReportButton />
      </div>

      <AddMembers />

      <MasterList members={members} />

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-xl font-light">Not active yet ({waiting.length})</h2>
          <p className="mb-4 text-sm text-white/50">
            A member joins the list above only after both approvals: the DO Admin, then their crew&apos;s Sergeant or
            Corporal.
          </p>
          <div className="space-y-2">
            {waiting.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-card p-4">
                <div>
                  <p className="text-sm uppercase tracking-wide">{w.fullName}</p>
                  <p className="mt-1 text-xs text-white/50">{crewName(w.crewId)}</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.12em] ${
                    w.status === "PENDING_ADMIN" ? "border-warn/50 text-warn" : "border-gold/50 text-gold"
                  }`}
                >
                  {w.status === "PENDING_ADMIN" ? "Awaiting DO Admin" : "Awaiting crew Sgt or Corporal"}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/approvals"
            className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-xs font-medium text-black transition hover:bg-neutral-200"
          >
            Open approvals
          </Link>
        </section>
      )}
    </div>
  );
}
