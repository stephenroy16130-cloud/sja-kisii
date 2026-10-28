import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const PUT = route(async (req: Request) => {
  const actor = await requirePermission("user:manage_accounts");
  const { open } = z.object({ open: z.boolean() }).parse(await req.json());
  await db.systemSetting.upsert({
    where: { key: "registrationOpen" },
    update: { value: open },
    create: { key: "registrationOpen", value: open },
  });
  await audit(actor.id, open ? "REGISTRATION_OPENED" : "REGISTRATION_CLOSED", "SystemSetting", "registrationOpen");
  return Response.json({ registrationOpen: open });
});
