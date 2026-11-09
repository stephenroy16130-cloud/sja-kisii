import { audit, requirePermission } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const c = await db.collection.findUnique({ where: { id } });
  if (!c) throw new HttpError(404, "Activity not found");

  const [members, paid] = await Promise.all([
    db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false, ...(c.crewId ? { crewId: c.crewId } : {}) },
      orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, phone: true, crewId: true },
    }),
    db.transaction.findMany({ where: { collectionId: id, status: "SUCCESS" }, select: { userId: true, amount: true, mpesaReceipt: true, updatedAt: true } }),
  ]);
  const byUser = new Map(paid.map((p) => [p.userId, p]));

  const lines = [
    ["Member", "Crew", "Phone", "Status", "Amount (KES)", "M-Pesa code", "Paid at"].map(csvCell).join(","),
    ...members.map((m) => {
      const p = byUser.get(m.id);
      return [
        m.fullName,
        crewName(m.crewId),
        m.phone,
        p ? "Paid" : "Not paid",
        p ? String(p.amount) : "",
        p?.mpesaReceipt ?? "",
        p ? p.updatedAt.toISOString() : "",
      ]
        .map(csvCell)
        .join(",");
    }),
  ];

  await audit(actor.id, "COLLECTION_EXPORTED", "Collection", id, { rows: members.length });
  const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "activity";
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${slug}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
