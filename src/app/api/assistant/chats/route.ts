import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

// The member's own chats, newest first
export const GET = route(async () => {
  const actor = await requireUser();
  const chats = await db.aiChat.findMany({
    where: { userId: actor.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, updatedAt: true },
  });
  return Response.json({ chats });
});

// Delete all of them
export const DELETE = route(async () => {
  const actor = await requireUser();
  const r = await db.aiChat.deleteMany({ where: { userId: actor.id } });
  return Response.json({ deleted: r.count });
});
