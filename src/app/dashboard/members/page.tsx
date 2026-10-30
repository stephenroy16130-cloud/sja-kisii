import { redirect } from "next/navigation";
import ReportButton from "@/components/report-button";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { socialPhoto } from "@/lib/profile";
import { can } from "@/lib/rbac";
import MasterList, { type MemberRow } from "./master-list";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "user:manage_accounts")) redirect("/dashboard");

  const rows = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false },
    orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
    select: {
      id: true, fullName: true, preferredName: true, socialPhotoAt: true, crewId: true,
      titles: true, isSuperintendent: true,
      dateOfBirth: true, gender: true, idType: true, idNumber: true,
    },
  });

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
    <div className="space-y-6">
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
      <MasterList members={members} />
    </div>
  );
}
