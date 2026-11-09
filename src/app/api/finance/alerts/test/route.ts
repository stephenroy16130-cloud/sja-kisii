import { requirePermission } from "@/lib/auth";
import { alertFinance } from "@/lib/finance-alerts";
import { route } from "@/lib/http";

export const POST = route(async () => {
  await requirePermission("finance:manage");
  const report = await alertFinance({ name: "Test Member", what: "a test payment", amount: "KES 1" });
  return Response.json(report);
});
