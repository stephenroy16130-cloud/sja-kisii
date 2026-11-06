import { createHash, randomBytes } from "crypto";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { escapeHtml, mailConfigured, sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/site";

// The same answer whether or not the email exists, so accounts cannot be probed
const GENERIC = { message: "If that email exists, a reset link has been sent." };

export const POST = route(async (req: Request) => {
  const { email } = z.object({ email: z.string().email() }).parse(await req.json());
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.isDeveloper) return Response.json(GENERIC);

  // At most 3 reset emails an hour for one account
  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recent >= 3) return Response.json(GENERIC);

  const token = randomBytes(32).toString("hex");
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  let link: string | null = null;
  try {
    link = `${await appUrl()}/reset-password?token=${token}`;
  } catch (e) {
    console.error(e);
  }

  // Sent after the response, so how long this takes never reveals whether the account exists
  after(async () => {
    if (!link) return;
    try {
      if (process.env.NODE_ENV !== "production") console.log(`[DEV] Password reset link: ${link}`);
      if (!mailConfigured()) {
        console.error("A password reset was requested but email is not set up");
        return;
      }
      const text =
        `Hello ${user.fullName},\n\nSomeone asked to reset your SJA Kisii password. ` +
        `Open this link within 1 hour to choose a new one:\n\n${link}\n\n` +
        `If you did not ask for this, ignore this email. Your password has not changed.`;
      const html =
        `<p>Hello ${escapeHtml(user.fullName)},</p>` +
        `<p>Someone asked to reset your SJA Kisii password. Open this link within 1 hour to choose a new one:</p>` +
        `<p><a href="${link}">Choose a new password</a></p>` +
        `<p>If you did not ask for this, ignore this email. Your password has not changed.</p>`;
      await sendMail(user.email, "Reset your SJA Kisii password", text, html);
    } catch (e) {
      console.error("Reset email failed", e);
    }
  });

  return Response.json(GENERIC);
});
