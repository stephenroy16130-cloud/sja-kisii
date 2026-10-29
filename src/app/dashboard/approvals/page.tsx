import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import ReviewButtons from "./review-buttons";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const filters: Prisma.UserWhereInput[] = [];
  if (can(user, "user:approve_registration")) filters.push({ status: "PENDING_ADMIN" });
  if (can(user, "crew:approve_members") && user.crewId) {
    filters.push({ status: "PENDING_CREW", crewId: user.crewId });
  }
  if (filters.length === 0) redirect("/dashboard");

  const pending = await db.user.findMany({
    where: { OR: filters },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, username: true, email: true, phone: true, crewId: true, status: true },
  });

  return (
    <div>
      <h1 className="heading accent-bar text-xl md:text-2xl">Approvals</h1>
      <p className="font-copy mb-8 mt-4 text-sm text-neutral-600">Members waiting for your decision.</p>

      {pending.length === 0 ? (
        <div className="font-copy border border-neutral-300 bg-white p-6 text-sm text-neutral-600">
          Nothing waiting. All caught up.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-4 border border-neutral-300 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {p.fullName} <span className="font-normal text-neutral-500">@{p.username}</span>
                </p>
                <p className="font-copy mt-1 text-sm text-neutral-600">
                  {p.email} · {p.phone} · {crewName(p.crewId)}
                </p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                  {p.status === "PENDING_ADMIN" ? "Awaiting DO Admin" : "Awaiting Crew Sgt or Corporal"}
                </p>
              </div>
              <ReviewButtons userId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
