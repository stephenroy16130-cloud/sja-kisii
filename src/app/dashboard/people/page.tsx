import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import PeopleManager from "./people-manager";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, "user:manage_titles")) redirect("/dashboard");

  const people = await db.user.findMany({
    where: { status: "ACTIVE", isSuperintendent: false, isDeveloper: false },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, username: true, crewId: true, titles: true },
  });

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">People and titles</h1>
      <p className="mb-8 mt-1 text-sm text-white/50">
        Promote or demote by ticking titles. Titles stack, and demotion never deletes a member&apos;s history.
      </p>
      <PeopleManager people={people} />
    </div>
  );
}
