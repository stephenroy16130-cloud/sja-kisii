import type { Prisma, Title } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ReviewButtons from "./review-buttons";

export const dynamic = "force-dynamic";

const LEADERS: Title[] = ["SERGEANT", "CORPORAL"];

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const approver = can(user, "user:approve_registration");
  const filters: Prisma.UserWhereInput[] = [];
  if (approver) filters.push({ status: "PENDING_ADMIN" });
  if (can(user, "crew:approve_members") && user.crewId) {
    filters.push({ status: "PENDING_CREW", crewId: user.crewId });
  }

  // Crews with no Sergeant or Corporal: the DO Admin can complete the second step for them
  let unled: number[] = [];
  if (approver) {
    const led = await db.user.findMany({
      where: { status: "ACTIVE", titles: { hasSome: LEADERS } },
      select: { crewId: true },
    });
    const ledSet = new Set(led.map((l) => l.crewId));
    unled = [1, 2, 3, 4].filter((c) => !ledSet.has(c));
    if (unled.length) filters.push({ status: "PENDING_CREW", crewId: { in: unled } });
  }
  if (filters.length === 0) redirect("/dashboard");

  const pending = await db.user.findMany({
    where: { OR: filters },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, username: true, email: true, phone: true, crewId: true, status: true },
  });

  const label = (p: (typeof pending)[number]) => {
    if (p.status === "PENDING_ADMIN") return "Awaiting DO Admin";
    if (approver && p.crewId && unled.includes(p.crewId) && user.crewId !== p.crewId) {
      return "No Sergeant or Corporal in this crew yet. You can approve";
    }
    return "Awaiting Crew Sgt or Corporal";
  };

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">Approvals</h1>
      <p className="mb-8 mt-1 text-sm text-white/50">Members waiting for your decision.</p>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-card p-6 text-sm text-white/50">
          Nothing waiting. All caught up.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {p.fullName} <span className="font-normal text-white/50">@{p.username}</span>
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {p.email} · {p.phone} · {crewName(p.crewId)}
                </p>
                <span className="mt-3 inline-block rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-white/60">
                  {label(p)}
                </span>
              </div>
              <ReviewButtons userId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
