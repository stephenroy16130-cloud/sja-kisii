import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";

export const PUT = route(async (req: Request) => {
  const actor = await requirePermission("finance:manage");
  const { fee } = z
    .object({ fee: z.number().int("Use whole shillings").min(0).max(100_000) })
    .parse(await req.json());
  await db.systemSetting.upsert({
    where: { key: "registrationFee" },
    update: { value: fee },
    create: { key: "registrationFee", value: fee },
  });
  await audit(actor.id, "REGISTRATION_FEE_SET", "SystemSetting", "registrationFee", { fee });
  return Response.json({ fee });
});
