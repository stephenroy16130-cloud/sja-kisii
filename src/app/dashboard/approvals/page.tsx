import { crewName } from "@/lib/crews";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
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
    select: { id: true, fullName: true, username: true, email: true, phone: true, crewId: true, status: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="text-3xl font-light tracking-tight">Approvals</h1>
      <p className="mb-8 mt-1 text-sm text-neutral-500">Members waiting for your decision.</p>

      {pending.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-black/15 p-6 text-sm text-neutral-500">Nothing waiting. All caught up.</div>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white ring-1 ring-black/15 p-5">
              <div>
                <p className="font-medium">{p.fullName} <span className="font-normal text-neutral-500">@{p.username}</span></p>
                <p className="mt-1 text-sm text-neutral-500">{p.email} · {p.phone} · {crewName(p.crewId)}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-neutral-500">
                  {p.status === "PENDING_ADMIN" ? "Awaiting DO Admin" : "Awaiting Crew Leader"}
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
