import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { socialSchema } from "@/lib/profile-schema";

export const PUT = route(async (req: Request) => {
  const actor = await requireUser();
  const { preferredName } = socialSchema.parse(await req.json());
  await db.user.update({ where: { id: actor.id }, data: { preferredName } });
  return Response.json({ preferredName });
});
