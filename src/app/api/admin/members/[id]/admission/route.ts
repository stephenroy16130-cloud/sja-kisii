import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { admissionOrEmpty } from "@/lib/admission";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requirePermission("user:manage_accounts");
  const { id } = await ctx.params;
  const u = await db.user.findUnique({ where: { id }, select: { admissionNumber: true, isDeveloper: true } });
  if (!u || u.isDeveloper) throw new HttpError(404, "Member not found");
  return Response.json({ admissionNumber: u.admissionNumber ?? "" });
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("user:manage_accounts");
  const { id } = await ctx.params;
  const { admissionNumber } = z.object({ admissionNumber: admissionOrEmpty }).parse(await req.json());

  const u = await db.user.findUnique({ where: { id }, select: { isDeveloper: true } });
  if (!u || u.isDeveloper) throw new HttpError(404, "Member not found");

  try {
    await db.user.update({ where: { id }, data: { admissionNumber: admissionNumber || null } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "That registration number belongs to another member.");
    }
    throw e;
  }
  await audit(actor.id, "ADMISSION_NUMBER_SET_BY_ADMIN", "User", id);
  return Response.json({ admissionNumber: admissionNumber || null });
});
