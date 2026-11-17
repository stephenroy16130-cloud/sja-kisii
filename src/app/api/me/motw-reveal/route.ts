import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { firstField } from "@/lib/schema-info";

// Marks the reveal as seen. Earlier unseen wins are marked too, so only the latest is ever shown.
export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const { resultId } = z.object({ resultId: z.string().min(1).max(60) }).parse(await req.json());

  const field = firstField("WeeklyResult", ["winnerId", "userId"]);
  if (!field) throw new HttpError(500, "The winner column could not be found");

  const mine = await db.weeklyResult.findFirst({
    where: { id: resultId, [field]: actor.id } as unknown as Prisma.WeeklyResultWhereInput,
    select: { weekStart: true },
  });
  if (!mine) throw new HttpError(404, "Not found");

  const done = await db.weeklyResult.updateMany({
    where: {
      [field]: actor.id,
      isMotwRevealed: false,
      weekStart: { lte: mine.weekStart },
    } as unknown as Prisma.WeeklyResultWhereInput,
    data: { isMotwRevealed: true },
  });
  return Response.json({ marked: done.count });
});
