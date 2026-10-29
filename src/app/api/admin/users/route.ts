import { Title } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

const schema = registerSchema.extend({
  crewId: z.number().int().min(1).max(4).optional(),
  titles: z.array(z.nativeEnum(Title)).default([]),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("user:provision");
  const data = schema.parse(await req.json());
  const titles = [...new Set(data.titles)];

  if (titles.includes("CORPORAL") && titles.includes("SERGEANT")) throw new HttpError(400, "Cannot be both Corporal and Sergeant");
  if (titles.length > 0 && !data.crewId) throw new HttpError(400, "Every leader must belong to a crew. Choose a crew.");

  const user = await db.user.create({
    data: {
      username: data.username,
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
      crewId: data.crewId,
      titles,
      passwordHash: await hashPassword(data.password),
      status: "ACTIVE",
      approvedById: actor.id,
      crewApprovedById: actor.id,
    },
    select: { id: true, username: true, titles: true },
  });
  await audit(actor.id, "ACCOUNT_PROVISIONED", "User", user.id, { titles });
  return Response.json(user, { status: 201 });
});
