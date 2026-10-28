import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const dev = await requirePermission("dev:bootstrap");

  if (await db.user.count({ where: { isSuperintendent: true } })) {
    throw new HttpError(409, "A Superintendent already exists");
  }

  const data = registerSchema.omit({ crewId: true }).parse(await req.json());
  const ds = await db.user.create({
    data: {
      username: data.username,
      email: data.email,
      phone: data.phone,
      fullName: data.fullName,
      passwordHash: await hashPassword(data.password),
      status: "ACTIVE",
      isSuperintendent: true,
    },
    select: { id: true, username: true },
  });
  await audit(dev.id, "SUPERINTENDENT_CREATED", "User", ds.id);
  return Response.json(ds, { status: 201 });
});
