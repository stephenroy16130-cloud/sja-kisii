import { requireUser } from "@/lib/auth";
import { route } from "@/lib/http";
import { permissionsFor } from "@/lib/rbac";

export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ user, permissions: [...permissionsFor(user)] });
});
