import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";

const schema = z.object({
  crewId: z.number().int().min(1).max(4),
  link: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/\S+$/i.test(v), {
      message: "Use a WhatsApp invite link, like https://chat.whatsapp.com/...",
    }),
});

export const PUT = route(async (req: Request) => {
  const actor = await requireUser();
  const { crewId, link } = schema.parse(await req.json());

  const ownLeader = can(actor, "crew:create_announcement") && actor.crewId === crewId;
  if (!ownLeader && !can(actor, "user:manage_accounts")) {
    throw new HttpError(403, "Only this crew's Sergeant or Corporal, or the DO Admin, can change this");
  }

  await db.crew.update({ where: { id: crewId }, data: { whatsappLink: link || null } });
  await audit(actor.id, "CREW_WHATSAPP_UPDATED", "Crew", String(crewId), { set: !!link });
  return Response.json({ crewId, link: link || null });
});
