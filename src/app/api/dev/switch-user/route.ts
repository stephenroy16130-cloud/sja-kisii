import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { createSession } from "@/lib/session";

export const POST = route(async (req: Request) => {
  // Development only. Production builds always answer 404.
  if (process.env.NODE_ENV === "production") throw new HttpError(404, "Not found");

  const { userId } = z.object({ userId: z.string().min(1) }).parse(await req.json());
  const user = await db.user.findFirst({
    where: { id: userId, email: { endsWith: "@test.com" }, status: "ACTIVE" },
    select: { id: true },
  });
  if (!user) throw new HttpError(404, "Not a test account");

  await createSession(user.id);
  return Response.json({ ok: true });
});
