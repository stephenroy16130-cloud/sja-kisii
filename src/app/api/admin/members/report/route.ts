import type { Gender, IdType, Title } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { calcAge, GENDER_LABEL, ID_LABEL, REPORT_FIELDS, REPORT_KEYS, type ReportKey } from "@/lib/profile";

const schema = z.object({ fields: z.array(z.enum(REPORT_KEYS)).min(1, "Choose at least one field") });

type Row = {
  fullName: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  phone: string;
  email: string;
  idType: IdType | null;
  idNumber: string | null;
  crewId: number | null;
  titles: Title[];
  isSuperintendent: boolean;
};

function value(u: Row, k: ReportKey): string {
  switch (k) {
    case "fullName": return u.fullName;
    case "dateOfBirth": return u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : "";
    case "age": return u.dateOfBirth ? String(calcAge(u.dateOfBirth)) : "";
    case "gender": return u.gender ? GENDER_LABEL[u.gender] : "";
    case "phone": return u.phone;
    case "email": return u.email;
    case "idType": return u.idType ? ID_LABEL[u.idType] : "";
    case "idNumber": return u.idNumber ?? "";
    case "crew": return u.crewId ? crewName(u.crewId) : "";
    case "titles":
      return [...(u.isSuperintendent ? ["Superintendent"] : []), ...u.titles.map((t) => t.replace(/_/g, " "))].join("; ");
  }
}

// Quote every cell, and defuse spreadsheet formulas (a cell starting with = + - @ would run in Excel)
function cell(v: string) {
  const s = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
  return '"' + s.replace(/"/g, '""') + '"';
}

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("user:manage_accounts");
  const { fields } = schema.parse(await req.json());
  const chosen = REPORT_FIELDS.filter((f) => fields.includes(f.key));

  const users = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false },
    orderBy: [{ crewId: "asc" }, { fullName: "asc" }],
    select: {
      fullName: true, dateOfBirth: true, gender: true, phone: true, email: true,
      idType: true, idNumber: true, crewId: true, titles: true, isSuperintendent: true,
    },
  });

  const lines = [
    chosen.map((f) => cell(f.label)).join(","),
    ...users.map((u) => chosen.map((f) => cell(value(u, f.key))).join(",")),
  ];

  await audit(actor.id, "MEMBER_REPORT_EXPORTED", "User", undefined, {
    fields: chosen.map((f) => f.key),
    rows: users.length,
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sja-members-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
