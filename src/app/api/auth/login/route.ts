import { audit } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export const POST = route(async (req: Request) => {
  const { identifier, password } = loginSchema.parse(await req.json());
  const id = identifier.trim().toLowerCase();

  const user = await db.user.findFirst({ where: { OR: [{ username: id }, { email: id }] } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid credentials");

  // A disabled developer account looks like any wrong login
  if (user.isDeveloper && user.status !== "ACTIVE") throw new HttpError(401, "Invalid credentials");

  switch (user.status) {
    case "PENDING_ADMIN":
      throw new HttpError(403, "Your account is awaiting approval by the DO Admin.");
    case "PENDING_CREW":
      throw new HttpError(403, "Your account is awaiting approval by your Crew Sergeant or Corporal.");
    case "REJECTED":
      throw new HttpError(403, "Your registration was not approved.");
    case "SUSPENDED":
    case "DISABLED":
      throw new HttpError(403, "This account is disabled.");
  }

  // Genesis rule: once the Superintendent logs in, the developer account is disabled
  if (user.isSuperintendent) {
    const { count } = await db.user.updateMany({
      where: { isDeveloper: true, status: "ACTIVE" },
      data: { status: "DISABLED" },
    });
    if (count > 0) await audit(user.id, "DEVELOPER_ACCOUNT_DISABLED", "User");
  }

  await createSession(user.id);
  return Response.json({ id: user.id, username: user.username, fullName: user.fullName });
});
