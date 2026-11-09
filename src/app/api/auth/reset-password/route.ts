import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { passwordSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const { email, code, password } = z
    .object({
      email: z.string().email(),
      code: z.string().trim().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
      password: passwordSchema,
    })
    .parse(await req.json());

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    throw new HttpError(400, "Invalid email or verification code");
  }

  const tokenHash = createHash("sha256").update(`${user.id}:${code}`).digest("hex");

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, "This reset code is invalid or has expired. Please request a new one.");
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: false },
    }),
    db.passwordResetToken.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return Response.json({ message: "Password updated successfully. You can now log in." });
});
