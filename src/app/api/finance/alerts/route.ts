import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAlertSettings, normalizeWhatsapp } from "@/lib/finance-alerts";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  push: z.boolean(),
  email: z.string().trim().max(120).refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address"),
  whatsapp: z.string().trim().max(25),
  scope: z.enum(["all", "shop"]),
});

export const GET = route(async () => {
  await requirePermission("finance:manage");
  return Response.json(await getAlertSettings());
});

export const PUT = route(async (req: Request) => {
  const actor = await requirePermission("finance:manage");
  const d = schema.parse(await req.json());
  const whatsapp = normalizeWhatsapp(d.whatsapp);
  if (whatsapp === null) throw new HttpError(400, "Enter the WhatsApp number with its country code, for example 254712345678");

  const value = { push: d.push, email: d.email.toLowerCase(), whatsapp, scope: d.scope };
  await db.systemSetting.upsert({
    where: { key: "financeAlerts" },
    update: { value },
    create: { key: "financeAlerts", value },
  });
  await audit(actor.id, "FINANCE_ALERTS_CHANGED", "SystemSetting", "financeAlerts", {
    push: value.push,
    hasEmail: Boolean(value.email),
    hasWhatsapp: Boolean(value.whatsapp),
    scope: value.scope,
  });
  return Response.json(value);
});
