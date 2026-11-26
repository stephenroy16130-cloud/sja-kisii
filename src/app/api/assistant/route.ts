import { z } from "zod";
import { aiDailyLimit, aiEnabled, nairobiDayStart } from "@/lib/ai-config";
import { buildUserContext } from "@/lib/ai-context";
import { SJA_KNOWLEDGE, SYSTEM_PROMPT } from "@/lib/ai-knowledge";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { askStream, type Turn } from "@/lib/openai-stream";

export const maxDuration = 60;

const schema = z.object({
  chatId: z.string().min(1).max(64).optional(),
  message: z.string().trim().min(1, "Ask a question first.").max(800, "Please keep your question under 800 characters."),
});

const titleOf = (m: string) => {
  const t = m.replace(/\s+/g, " ").trim();
  return t.length > 50 ? t.slice(0, 47).trimEnd() + "..." : t;
};

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  if (actor.isDeveloper) throw new HttpError(403, "The assistant is for members.");
  if (!aiEnabled()) throw new HttpError(503, "The assistant is not switched on yet.");

  const { chatId, message } = schema.parse(await req.json());

  // Limits keep the cost under control
  const limit = aiDailyLimit();
  const [today, lastMinute] = await Promise.all([
    db.auditLog.count({ where: { actorId: actor.id, action: "AI_ASK", createdAt: { gte: nairobiDayStart() } } }),
    db.auditLog.count({ where: { actorId: actor.id, action: "AI_ASK", createdAt: { gte: new Date(Date.now() - 60_000) } } }),
  ]);
  if (today >= limit) throw new HttpError(429, `You have used all ${limit} questions for today. Please come back tomorrow.`);
  if (lastMinute >= 6) throw new HttpError(429, "Please slow down a little and try again in a minute.");

  // Continue the member's own chat, or start a new one
  let chat = chatId ? await db.aiChat.findFirst({ where: { id: chatId, userId: actor.id }, select: { id: true } }) : null;
  if (chatId && !chat) throw new HttpError(404, "That chat no longer exists. Please start a new one.");
  const isNew = !chat;
  if (!chat) chat = await db.aiChat.create({ data: { userId: actor.id, title: titleOf(message) }, select: { id: true } });
  const id = chat.id;

  try {
    const past = await db.aiMessage.findMany({
      where: { chatId: id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { role: true, content: true },
    });
    const turns: Turn[] = [
      ...past.reverse().map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content })),
      { role: "user", content: message },
    ];

    // The fixed text comes first, so the provider can reuse it from its cache and charge less
    const instructions = [SYSTEM_PROMPT, SJA_KNOWLEDGE, await buildUserContext(actor)].join("\n\n");

    await audit(actor.id, "AI_ASK", "Ai");
    const stream = await askStream(instructions, turns, (u) => {
      if (u) void audit(actor.id, "AI_TOKENS", "Ai", undefined, { input: u.input, output: u.output }).catch(() => undefined);
    });
    await db.aiMessage.create({ data: { chatId: id, role: "user", content: message } });

    // Pass the answer through to the member and keep a copy for the chat history
    const dec = new TextDecoder();
    let answer = "";
    const saved = stream.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          answer += dec.decode(chunk, { stream: true });
          controller.enqueue(chunk);
        },
        async flush() {
          const text = answer.trim();
          if (!text || text.startsWith("Sorry,")) return;
          try {
            await db.aiMessage.create({ data: { chatId: id, role: "assistant", content: text } });
            await db.aiChat.update({ where: { id }, data: { updatedAt: new Date() } });
          } catch (e) {
            console.error("could not save the chat", e);
          }
        },
      })
    );

    return new Response(saved, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-Chat-Id": id,
      },
    });
  } catch (e) {
    if (isNew) await db.aiChat.delete({ where: { id } }).catch(() => undefined);
    throw e;
  }
});
