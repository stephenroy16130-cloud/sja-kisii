import { Title } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { leadershipLocked } from "@/lib/leadership";
import { hashPassword } from "@/lib/password";
import { can } from "@/lib/rbac";
import { registerSchema } from "@/lib/validation";

const schema = registerSchema.extend({
  crewId: z.number().int().min(1).max(4).optional(),
  titles: z.array(z.nativeEnum(Title)).default([]),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const admin = can(actor, "user:provision"); // the DO Admin
  const appointer = can(actor, "user:appoint_admin"); // the Superintendent
  if (!admin && !appointer) throw new HttpError(403, "You do not have permission to do this");

  const data = schema.parse(await req.json());
  const titles = [...new Set(data.titles)];

  if (titles.includes("CORPORAL") && titles.includes("SERGEANT")) throw new HttpError(400, "Cannot be both Corporal and Sergeant");
  if (titles.length > 0 && !data.crewId) throw new HttpError(400, "Every leader must belong to a crew. Choose a crew.");

  if (admin) {
    if (titles.includes("DO_ADMIN")) throw new HttpError(403, "Only the Divisional Superintendent creates the DO Admin account");
    if (await leadershipLocked()) throw new HttpError(409, "Leadership is locked. Reopen promotions on the People page first.");
  } else if (titles.length !== 1 || titles[0] !== "DO_ADMIN") {
    throw new HttpError(403, "The Superintendent creates the DO Admin account only");
  }

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
      mustChangePassword: true,
      approvedById: actor.id,
      crewApprovedById: actor.id,
    },
    select: { id: true, username: true, titles: true },
  });
  await audit(actor.id, "ACCOUNT_PROVISIONED", "User", user.id, { titles });
  return Response.json(user, { status: 201 });
});
