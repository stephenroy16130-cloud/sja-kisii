import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const code = (e: unknown) => (e as { code?: string }).code ?? (e instanceof Error ? e.name : "error");

// TEMPORARY diagnostic. Says which settings exist and whether the database answers. Delete after use.
export async function GET() {
  const has = (k: string) => Boolean(process.env[k]);
  let host = "not set";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname || "not set";
  } catch {
    host = "invalid";
  }
  const out: Record<string, unknown> = {
    settings: {
      DATABASE_URL: has("DATABASE_URL"),
      SESSION_SECRET: has("SESSION_SECRET"),
      MPESA_CONSUMER_KEY: has("MPESA_CONSUMER_KEY"),
      MPESA_CALLBACK_SECRET: has("MPESA_CALLBACK_SECRET"),
    },
    databaseHost: host,
  };
  try {
    await db.$queryRaw`SELECT 1`;
    out.database = "reachable";
  } catch (e) {
    out.database = code(e);
  }
  try {
    out.members = await db.user.count();
  } catch (e) {
    out.userTable = code(e);
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
