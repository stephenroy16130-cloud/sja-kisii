import { Prisma } from "@prisma/client";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { officialSchema, parseDob } from "@/lib/profile-schema";

// A member can only ever change their OWN official profile
export const PUT = route(async (req: Request) => {
  const actor = await requireUser();
  const d = officialSchema.parse(await req.json());

  try {
    await db.user.update({
      where: { id: actor.id },
      data: {
        fullName: d.fullName,
        dateOfBirth: parseDob(d.dateOfBirth) as Date,
        gender: d.gender,
        phone: d.phone,
        email: d.email,
        idType: d.idType,
        idNumber: d.idNumber,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "That email, phone number or ID number belongs to another account");
    }
    throw e;
  }
  await audit(actor.id, "OFFICIAL_PROFILE_UPDATED", "User", actor.id);
  return Response.json({ ok: true });
});
