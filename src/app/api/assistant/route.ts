import { z } from "zod";
import { aiDailyLimit, aiEnabled, nairobiDayStart } from "@/lib/ai-config";
import { buildUserContext } from "@/lib/ai-context";
import { SJA_KNOWLEDGE, SYSTEM_PROMPT } from "@/lib/ai-knowledge";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { askStream } from "@/lib/openai-stream";

export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(16),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  if (actor.isDeveloper) throw new HttpError(403, "The assistant is for members.");
  if (!aiEnabled()) throw new HttpError(503, "The assistant is not switched on yet.");

  const { messages } = schema.parse(await req.json());
  const last = messages[messages.length - 1];
  if (last.role !== "user") throw new HttpError(400, "Ask a question first.");
  if (last.content.length > 800) throw new HttpError(400, "Please keep your question under 800 characters.");

  // Limits keep the cost under control
  const limit = aiDailyLimit();
  const [today, lastMinute] = await Promise.all([
    db.auditLog.count({ where: { actorId: actor.id, action: "AI_ASK", createdAt: { gte: nairobiDayStart() } } }),
    db.auditLog.count({ where: { actorId: actor.id, action: "AI_ASK", createdAt: { gte: new Date(Date.now() - 60_000) } } }),
  ]);
  if (today >= limit) throw new HttpError(429, `You have used all ${limit} questions for today. Please come back tomorrow.`);
  if (lastMinute >= 6) throw new HttpError(429, "Please slow down a little and try again in a minute.");

  // The fixed text comes first, so OpenAI can reuse it from its cache and charge less
  const instructions = [SYSTEM_PROMPT, SJA_KNOWLEDGE, await buildUserContext(actor)].join("\n\n");
  const turns = messages.slice(-8);

  await audit(actor.id, "AI_ASK", "Ai");
  const stream = await askStream(instructions, turns, (u) => {
    if (u) void audit(actor.id, "AI_TOKENS", "Ai", undefined, { input: u.input, output: u.output }).catch(() => undefined);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
});
