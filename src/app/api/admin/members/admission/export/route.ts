import { audit, requirePermission } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const actor = await requirePermission("user:manage_accounts");
  const rows = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false },
    orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
    select: { fullName: true, crewId: true, admissionNumber: true },
  });

  const lines = [
    ["Member", "Crew", "Admission number", "Status"].map(csvCell).join(","),
    ...rows.map((r) =>
      [r.fullName, crewName(r.crewId), r.admissionNumber ?? "", r.admissionNumber ? "Added" : "Missing"].map(csvCell).join(",")
    ),
  ];
  await audit(actor.id, "ADMISSION_EXPORTED", "User", undefined, { rows: rows.length });
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="admission-numbers.csv"',
      "Cache-Control": "no-store",
    },
  });
});
