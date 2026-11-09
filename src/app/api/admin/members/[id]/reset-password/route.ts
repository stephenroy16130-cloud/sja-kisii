import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { can } from "@/lib/rbac";
import { tempPassword } from "@/lib/temp-password";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true, phone: true, status: true, titles: true, isSuperintendent: true, isDeveloper: true },
  });
  if (!target || target.isDeveloper) throw new HttpError(404, "Member not found");
  if (target.id === actor.id) throw new HttpError(400, "Use Change password for your own account");

  // The DO Admin resets plain members only. Resetting a leader's password would let someone become that leader.
  const asAdmin = can(actor, "user:manage_accounts") && target.titles.length === 0 && !target.isSuperintendent;
  const asSuperintendent = actor.isSuperintendent;
  if (!asAdmin && !asSuperintendent) throw new HttpError(403, "You cannot reset this person's password");
  if (target.status !== "ACTIVE") throw new HttpError(409, "Only active members can have their password reset");

  const temp = tempPassword();
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(temp), mustChangePassword: true } });
  await audit(actor.id, "PASSWORD_RESET_BY_ADMIN", "User", id);
  return Response.json({ tempPassword: temp, fullName: target.fullName, email: target.email, phone: target.phone });
});
