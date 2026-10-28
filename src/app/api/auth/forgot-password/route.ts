import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const { email } = z.object({ email: z.string().email() }).parse(await req.json());
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user && !user.isDeveloper) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Password reset link: http://localhost:3000/reset-password?token=${token}`);
    }
  }
  return Response.json({ message: "If that email exists, a reset link has been sent." });
});
