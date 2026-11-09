import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { tempPassword } from "@/lib/temp-password";
import { emailSchema, phoneSchema } from "@/lib/validation";

export const maxDuration = 60;

const body = z.object({
  rows: z
    .array(
      z.object({
        fullName: z.string().trim().min(2).max(100),
        phone: z.string().max(30),
        email: z.string().max(120),
        crewId: z.number().int().min(1).max(4),
      })
    )
    .min(1)
    .max(25),
});

type Result = { name: string; email: string; phone: string; username?: string; tempPassword?: string; error?: string };

// A username from the email's first part, made unique
async function freeUsername(email: string, taken: Set<string>) {
  let base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16);
  if (base.length < 3) base = (base + "member").slice(0, 8);
  for (let n = 0; n < 50; n++) {
    const cand = n === 0 ? base : `${base}${n + 1}`;
    if (taken.has(cand)) continue;
    if (!(await db.user.findUnique({ where: { username: cand }, select: { id: true } }))) {
      taken.add(cand);
      return cand;
    }
  }
  return `${base}${Date.now() % 100000}`.slice(0, 20);
}

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("user:manage_accounts");
  const { rows } = body.parse(await req.json());

  const taken = new Set<string>();
  const results: Result[] = [];
  for (const r of rows) {
    const phone = phoneSchema.safeParse(r.phone);
    const email = emailSchema.safeParse(r.email);
    if (!email.success || !phone.success) {
      results.push({
        name: r.fullName,
        email: r.email,
        phone: r.phone,
        error: !email.success ? "That email address is not valid" : "That phone number is not valid",
      });
      continue;
    }
    const username = await freeUsername(email.data, taken);
    const temp = tempPassword();
    try {
      await db.user.create({
        data: {
          username,
          email: email.data,
          phone: phone.data,
          fullName: r.fullName,
          crewId: r.crewId,
          passwordHash: await hashPassword(temp),
          status: "ACTIVE", // added by the DO Admin, so no approval steps
          mustChangePassword: true,
          approvedById: actor.id,
          crewApprovedById: actor.id,
        },
      });
      results.push({ name: r.fullName, email: email.data, phone: phone.data, username, tempPassword: temp });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        results.push({ name: r.fullName, email: email.data, phone: phone.data, error: "That email or phone number is already registered" });
      } else {
        throw e;
      }
    }
  }

  const created = results.filter((x) => x.tempPassword).length;
  await audit(actor.id, "MEMBERS_ADDED_MANUALLY", "User", undefined, { created, failed: results.length - created });
  return Response.json({ results });
});
