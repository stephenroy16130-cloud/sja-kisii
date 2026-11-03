import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const GET = route(async () => {
  const actor = await requireUser();
  const rows = await db.passkey.findMany({
    where: { userId: actor.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, deviceName: true, createdAt: true, lastUsedAt: true },
  });
  return Response.json({ passkeys: rows });
});
