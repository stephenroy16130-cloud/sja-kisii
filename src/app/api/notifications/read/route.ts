import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

const schema = z
  .object({ id: z.string().min(1).optional(), all: z.boolean().optional() })
  .refine((d) => d.id || d.all, { message: "Nothing to mark" });

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const d = schema.parse(await req.json());
  const r = await db.notification.updateMany({
    where: { userId: actor.id, readAt: null, ...(d.all ? {} : { id: d.id }) },
    data: { readAt: new Date() },
  });
  return Response.json({ marked: r.count });
});
