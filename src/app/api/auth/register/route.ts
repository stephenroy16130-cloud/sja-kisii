import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const setting = await db.systemSetting.findUnique({ where: { key: "registrationOpen" } });
  if (setting?.value !== true) throw new HttpError(403, "Registration is currently closed");

  const data = registerSchema.parse(await req.json());

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
