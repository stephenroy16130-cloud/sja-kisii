import type { Title } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { leadershipLocked } from "@/lib/leadership";
import { can } from "@/lib/rbac";
import PeopleManager from "./people-manager";

export const dynamic = "force-dynamic";

const SINGLE: Title[] = ["DO_ADMIN", "DO_FINANCE", "DO_OPERATIONS", "DO_TRAINING", "DSM", "BAND_LEAD"];

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "user:manage_titles")) redirect("/dashboard");

  const [people, locked] = await Promise.all([
    db.user.findMany({
      where: { status: "ACTIVE", isSuperintendent: false, isDeveloper: false },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, username: true, crewId: true, titles: true },
    }),
    leadershipLocked(),
  ]);

  // Posts nobody holds yet, so the Superintendent knows what is left before locking
  const vacant = [
    ...SINGLE.filter((t) => !people.some((p) => p.titles.includes(t))).map((t) => t.replace(/_/g, " ")),
    ...[1, 2, 3, 4]
      .filter((c) => !people.some((p) => p.crewId === c && p.titles.some((t) => t === "SERGEANT" || t === "CORPORAL")))
      .map((c) => `Sergeant or Corporal, ${crewName(c)}`),
  ];

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">People and titles</h1>
      <p className="mb-8 mt-1 text-sm text-white/50">
        Promote or demote by ticking titles. Titles stack, and demotion never deletes a member&apos;s history.
      </p>
      <PeopleManager people={people} locked={locked} vacant={vacant} />
    </div>
  );
}
