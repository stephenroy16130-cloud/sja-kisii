import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// A chat is only ever found for the member who owns it
async function mine(ctx: Ctx) {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const chat = await db.aiChat.findFirst({ where: { id, userId: actor.id }, select: { id: true } });
  if (!chat) throw new HttpError(404, "Chat not found");
  return chat.id;
}

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const id = await mine(ctx);
  const messages = await db.aiMessage.findMany({
    where: { chatId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { role: true, content: true },
  });
  return Response.json({ messages });
});

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const id = await mine(ctx);
  const { title } = z.object({ title: z.string().trim().min(1, "Give the chat a name").max(80) }).parse(await req.json());
  await db.aiChat.update({ where: { id }, data: { title } });
  return Response.json({ id, title });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const id = await mine(ctx);
  await db.aiChat.delete({ where: { id } });
  return Response.json({ deleted: true });
});
