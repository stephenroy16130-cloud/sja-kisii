import { db } from "./db";

export type OpenState = "OPEN" | "CLOSED" | "EXPIRED";

export function openState(c: { isOpen: boolean; closesAt: Date | null }, now = new Date()): OpenState {
  if (!c.isOpen) return "CLOSED";
  if (c.closesAt && c.closesAt <= now) return "EXPIRED";
  return "OPEN";
}

// Everything the live payment list shows. The page and the refresh endpoint both use this.
export async function collectionLive(c: { id: string; crewId: number | null }) {
  const [paidTx, pending, members] = await Promise.all([
    db.transaction.findMany({
      where: { collectionId: c.id, status: "SUCCESS" },
      orderBy: { updatedAt: "desc" },
      take: 500,
      include: { user: { select: { fullName: true, crewId: true } } },
    }),
    db.transaction.count({
      where: { collectionId: c.id, status: "PENDING", createdAt: { gte: new Date(Date.now() - 180_000) } },
    }),
    db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false, ...(c.crewId ? { crewId: c.crewId } : {}) },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);
  const paid = new Set(paidTx.map((t) => t.userId));
  return {
    total: paidTx.reduce((s, t) => s + Number(String(t.amount)), 0),
    count: paidTx.length,
    pending,
    eligible: members.length,
    payments: paidTx.map((t) => ({
      id: t.id,
      name: t.user.fullName,
      crewId: t.user.crewId,
      amount: Number(String(t.amount)),
      receipt: t.mpesaReceipt,
      at: t.updatedAt.toISOString(),
    })),
    unpaid: members.filter((m) => !paid.has(m.id)).slice(0, 300).map((m) => m.fullName),
  };
}
export type CollectionLive = Awaited<ReturnType<typeof collectionLive>>;
