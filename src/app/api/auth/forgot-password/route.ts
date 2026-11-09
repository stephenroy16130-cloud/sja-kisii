import { createHash, randomInt } from "crypto";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { escapeHtml, mailConfigured, sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/site";

// The same answer whether or not the email exists, so accounts cannot be probed
const GENERIC = { message: "If that email exists, a reset code has been sent." };

export const POST = route(async (req: Request) => {
  const { email } = z.object({ email: z.string().email() }).parse(await req.json());
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || user.isDeveloper) return Response.json(GENERIC);

  // At most 3 reset emails an hour for one account
  const recent = await db.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
  });
  if (recent >= 3) return Response.json(GENERIC);

  // Generate 6-digit verification code
  const code = randomInt(100000, 999999).toString();
  const tokenHash = createHash("sha256").update(`${user.id}:${code}`).digest("hex");

  // Invalidate any active reset tokens for this user
  await db.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  });

  let link: string | null = null;
  try {
    link = `${await appUrl()}/reset-password?email=${encodeURIComponent(user.email)}&code=${code}`;
  } catch (e) {
    console.error(e);
  }

  // Sent after the response, so how long this takes never reveals whether the account exists
  after(async () => {
    try {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Reset code for ${user.email}: ${code}`);
        if (link) console.log(`[DEV] Reset link: ${link}`);
      }
      if (!mailConfigured()) {
        console.error("A password reset was requested but email is not set up");
        return;
      }
      const text =
        `Hello ${user.fullName},\n\n` +
        `Your SJA Kisii password reset code is: ${code}\n\n` +
        `This code will expire in 15 minutes.\n\n` +
        (link ? `You can also reset your password directly using this link:\n${link}\n\n` : "") +
        `If you did not ask for this, ignore this email. Your password has not changed.`;

      const html =
        `<div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #111;">` +
        `<h2 style="margin-bottom: 12px; color: #111;">Password Reset Code</h2>` +
        `<p>Hello <strong>${escapeHtml(user.fullName)}</strong>,</p>` +
        `<p>Someone requested to reset your SJA Kisii account password. Use the 6-digit code below to set a new password:</p>` +
        `<div style="margin: 24px 0; padding: 20px; text-align: center; background-color: #f4f4f5; border-radius: 8px; border: 1px solid #e4e4e7;">` +
        `<span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #09090b; font-family: monospace;">${code}</span>` +
        `</div>` +
        `<p style="font-size: 14px; color: #666;">This code expires in <strong>15 minutes</strong>.</p>` +
        (link
          ? `<p style="margin-top: 24px;"><a href="${link}" style="background-color: #18181b; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 14px;">Reset Password Directly</a></p>`
          : "") +
        `<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />` +
        `<p style="font-size: 12px; color: #888;">If you did not request this, you can safely ignore this email.</p>` +
        `</div>`;

      await sendMail(user.email, "Your SJA Kisii password reset code", text, html);
    } catch (e) {
      console.error("Reset email failed", e);
    }
  });

  return Response.json(GENERIC);
});
