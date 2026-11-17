import { getCurrentUser } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { firstField } from "@/lib/schema-info";
import AnnouncementManagerClient, { type AnnItem } from "./announcement-manager-client";

const TEXT_FIELDS = ["body", "content", "message", "description", "text"];

// At the bottom of the Crew page: fix or remove announcements already posted
export default async function AnnouncementManager() {
  const user = await getCurrentUser();
  if (!user) return null;
  const mod = can(user, "content:moderate");
  const leader = can(user, "crew:create_announcement") && user.crewId !== null;
  if (!mod && !leader) return null;

  const rows = await db.announcement.findMany({
    where: mod ? {} : { crewId: user.crewId as number },
    orderBy: { id: "desc" },
    take: 20,
  });
  if (rows.length === 0) return null;

  const paid = await db.transaction.groupBy({
    by: ["announcementId"],
    where: { announcementId: { in: rows.map((r) => r.id) }, status: "SUCCESS" },
    _count: { _all: true },
  });
  const textField = firstField("Announcement", TEXT_FIELDS);

  const items: AnnItem[] = rows.map((r) => {
    const raw = r as unknown as Record<string, unknown>;
    const fee = raw.paymentAmount;
    return {
      id: r.id,
      title: r.title,
      text: textField ? String(raw[textField] ?? "") : null,
      amount: fee === null || fee === undefined ? null : Number(String(fee)),
      paid: paid.find((p) => p.announcementId === r.id)?._count._all ?? 0,
      crew: r.crewId ? crewName(r.crewId) : "All crews",
    };
  });

  return (
    <section>
      <h2 className="mb-1 text-xl font-light">Your announcements</h2>
      <p className="mb-4 text-sm text-white/50">Posted something wrong? Edit it or delete it here.</p>
      <AnnouncementManagerClient items={items} />
    </section>
  );
}
