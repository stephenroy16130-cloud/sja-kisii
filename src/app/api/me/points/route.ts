import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { servicePoints } from "@/lib/service-points";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json(await servicePoints(user.id), { headers: { "Cache-Control": "no-store" } });
});
