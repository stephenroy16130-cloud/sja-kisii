import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { notifyTitles } from "@/lib/push";
import { registerSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const setting = await db.systemSetting.findUnique({ where: { key: "registrationOpen" } });
  if (setting?.value !== true) throw new HttpError(403, "Registration is currently closed");

  const data = registerSchema.parse(await req.json());

  // If this email/phone/username belonged to a previously rejected applicant, allow them to re-register
  const rejectedUser = await db.user.findFirst({
    where: {
      status: "REJECTED",
      OR: [{ email: data.email }, { phone: data.phone }, { username: data.username }],
    },
  });

  if (rejectedUser) {
    const activeConflict = await db.user.findFirst({
      where: {
        id: { not: rejectedUser.id },
        OR: [{ email: data.email }, { phone: data.phone }, { username: data.username }],
      },
    });
    if (activeConflict) {
      throw new HttpError(409, "Username, email or phone number is already in use by an active member");
    }

    const user = await db.user.update({
      where: { id: rejectedUser.id },
      data: {
        username: data.username,
        email: data.email,
        phone: data.phone,
        fullName: data.fullName,
        crewId: data.crewId,
        passwordHash: await hashPassword(data.password),
        status: "PENDING_ADMIN",
        approvedById: null,
        crewApprovedById: null,
      },
      select: { id: true },
    });

    after(() =>
      notifyTitles(["DO_ADMIN"], {
        title: "Re-submitted registration awaiting approval",
        body: data.fullName,
        url: "/dashboard/approvals",
        tag: "reg-" + user.id,
      })
    );

    return Response.json(
      { id: user.id, message: "Registration submitted. Your account is awaiting DO Admin approval." },
      { status: 201 }
    );
  }

  try {
    const user = await db.user.create({
      data: {
        username: data.username,
        email: data.email,
        phone: data.phone,
        fullName: data.fullName,
        crewId: data.crewId,
        passwordHash: await hashPassword(data.password),
        status: "PENDING_ADMIN",
      },
      select: { id: true },
    });
    after(() =>
      notifyTitles(["DO_ADMIN"], {
        title: "New member awaiting approval",
        body: data.fullName,
        url: "/dashboard/approvals",
        tag: "reg-" + user.id,
      })
    );
    return Response.json(
      { id: user.id, message: "Registered. Your account is awaiting DO Admin approval." },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Username, email or phone number is already in use");
    }
    throw e;
  }
});
