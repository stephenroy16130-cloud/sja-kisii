import type { Title } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { leadershipLocked } from "@/lib/leadership";
import { can } from "@/lib/rbac";
import PeopleManager, { type Leaders } from "./people-manager";

export const dynamic = "force-dynamic";

const DIVISIONAL: { title: Title; label: string }[] = [
  { title: "DO_ADMIN", label: "DO Admin" },
  { title: "DO_FINANCE", label: "DO Finance" },
  { title: "DO_OPERATIONS", label: "DO Operations" },
  { title: "DO_TRAINING", label: "DO Training" },
  { title: "DSM", label: "DSM" },
  { title: "BAND_LEAD", label: "Band Lead" },
];

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

  const holders = (t: Title, crewId?: number) =>
    people.filter((p) => p.titles.includes(t) && (crewId === undefined || p.crewId === crewId)).map((p) => p.fullName);

  const leaders: Leaders = {
    crews: [1, 2, 3, 4].map((crewId) => ({
      crewId,
      sergeants: holders("SERGEANT", crewId),
      corporals: holders("CORPORAL", crewId),
    })),
    divisional: DIVISIONAL.map((d) => ({ label: d.label, holders: holders(d.title) })),
  };

  // Posts nobody holds yet, so the Superintendent knows what is left before locking
  const vacant = [
    ...leaders.divisional.filter((d) => d.holders.length === 0).map((d) => d.label),
    ...leaders.crews.flatMap((c) => [
      ...(c.sergeants.length === 0 ? [`Sergeant, ${crewName(c.crewId)}`] : []),
      ...(c.corporals.length === 0 ? [`Corporal, ${crewName(c.crewId)}`] : []),
    ]),
  ];

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">People and titles</h1>
      <p className="mb-8 mt-1 text-sm text-white/50">
        Promote or demote by ticking titles. Titles stack, and demotion never deletes a member&apos;s history.
      </p>
      <PeopleManager people={people} locked={locked} vacant={vacant} leaders={leaders} />
    </div>
  );
}
