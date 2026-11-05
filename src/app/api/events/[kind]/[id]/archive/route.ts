import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { opPhase } from "@/lib/fieldops";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";

export const POST = route(async (req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) => {
  const actor = await requireUser();
  const p = await ctx.params;
  const kind = z.enum(["fieldop", "training"]).parse(p.kind);
  const { archived } = z.object({ archived: z.boolean() }).parse(await req.json());
  const now = new Date();
  const data = archived ? { archivedAt: now, archivedById: actor.id } : { archivedAt: null, archivedById: null };
  let title: string;

  if (kind === "fieldop") {
    if (!can(actor, "fieldop:manage")) throw new HttpError(403, "Only DO Operations can do this");
    const o = await db.fieldOp.findUnique({ where: { id: p.id } });
    if (!o) throw new HttpError(404, "Operation not found");
    if (archived && opPhase(o.startsAt, o.endsAt, now) !== "PAST") {
      throw new HttpError(409, "Only past operations can be deleted");
    }
    await db.fieldOp.update({ where: { id: p.id }, data });
    title = o.title;
  } else {
    const t = await db.training.findUnique({ where: { id: p.id } });
    if (!t) throw new HttpError(404, "Training record not found");
    const allowed = can(actor, "training:verify") || (t.createdById === actor.id && t.status !== "VERIFIED");
    if (!allowed) throw new HttpError(403, "You cannot delete this record");
    if (archived && t.heldAt > now) throw new HttpError(409, "Only past sessions can be deleted");
    await db.training.update({ where: { id: p.id }, data });
    title = t.title;
  }

  await audit(actor.id, archived ? "EVENT_ARCHIVED" : "EVENT_RESTORED", kind, p.id, { title });
  return Response.json({ id: p.id, archived });
});
