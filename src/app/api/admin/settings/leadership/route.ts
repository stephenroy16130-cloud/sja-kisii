import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const PUT = route(async (req: Request) => {
  const actor = await requirePermission("user:manage_titles");
  const { locked } = z.object({ locked: z.boolean() }).parse(await req.json());
  await db.systemSetting.upsert({
    where: { key: "leadershipLocked" },
    update: { value: locked },
    create: { key: "leadershipLocked", value: locked },
  });
  await audit(actor.id, locked ? "LEADERSHIP_LOCKED" : "LEADERSHIP_REOPENED", "SystemSetting", "leadershipLocked");
  return Response.json({ locked });
});
