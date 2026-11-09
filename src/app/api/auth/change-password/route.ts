import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = z.object({ current: z.string().min(1), next: passwordSchema }).parse(await req.json());

  const row = await db.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(d.current, row.passwordHash))) {
    throw new HttpError(400, "Your current password is not correct");
  }
  if (d.current === d.next) throw new HttpError(400, "Choose a password different from the current one");

  await db.user.update({
    where: { id: actor.id },
    data: { passwordHash: await hashPassword(d.next), mustChangePassword: false },
  });
  await audit(actor.id, "PASSWORD_CHANGED", "User", actor.id);
  return Response.json({ ok: true });
});
