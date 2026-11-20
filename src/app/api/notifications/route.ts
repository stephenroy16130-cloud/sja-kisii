import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

// Clears the member's whole notification history
export const DELETE = route(async () => {
  const actor = await requireUser();
  const r = await db.notification.deleteMany({ where: { userId: actor.id } });
  return Response.json({ removed: r.count });
});
