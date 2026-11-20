import { route } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const POST = route(async () => {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { hasSeenMotw: true },
  });
  return Response.json({ ok: true });
});

