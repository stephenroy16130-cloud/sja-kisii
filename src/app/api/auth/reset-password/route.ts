import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const { token, password } = z.object({ token: z.string().min(1), password: passwordSchema }).parse(await req.json());
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, "This reset link is invalid or has expired");
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  return Response.json({ message: "Password updated. You can now log in." });
});
