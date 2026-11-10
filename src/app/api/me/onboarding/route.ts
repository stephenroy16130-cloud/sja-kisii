import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const { completed } = z.object({ completed: z.boolean() }).parse(await req.json());
  await db.user.update({ where: { id: actor.id }, data: { hasCompletedOnboarding: completed } });
  return Response.json({ completed });
});
