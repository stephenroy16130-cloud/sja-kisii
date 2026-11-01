import { audit, requirePermission } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { PURPOSE_WORD, TX_WORD } from "@/lib/mpesa";

export const GET = route(async () => {
  const actor = await requirePermission("finance:manage");
  const rows = await db.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: { user: { select: { fullName: true } }, order: { select: { status: true } } },
  });

  const head = ["Date", "Member", "Purpose", "Amount (KES)", "Phone", "Status", "M-Pesa code", "Note"];
  const lines = [
    head.map(csvCell).join(","),
    ...rows.map((r) =>
      [
        r.createdAt.toISOString(),
        r.user.fullName,
        PURPOSE_WORD[r.purpose],
        String(r.amount),
        r.phone,
        TX_WORD[r.status],
        r.mpesaReceipt ?? "",
        r.status === "SUCCESS" && r.order?.status === "CANCELLED" ? "Order cancelled after payment: refund needed" : r.resultDesc ?? "",
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  await audit(actor.id, "FINANCE_EXPORT", "Transaction", undefined, { rows: rows.length });
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sja-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
