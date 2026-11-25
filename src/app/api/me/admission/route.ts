import { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { admissionOrEmpty } from "@/lib/admission";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const PUT = route(async (req: Request) => {
  const actor = await requireUser();
  const { admissionNumber } = z.object({ admissionNumber: admissionOrEmpty }).parse(await req.json());

  try {
    await db.user.update({ where: { id: actor.id }, data: { admissionNumber: admissionNumber || null } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "That registration number is already registered to another member. Check it, or ask the DO Admin.");
    }
    throw e;
  }
  await audit(actor.id, "ADMISSION_NUMBER_SET", "User", actor.id);
  return Response.json({ admissionNumber: admissionNumber || null });
});
