export const dynamic = "force-dynamic";

const why = (e: unknown) => (e as { code?: string }).code ?? (e instanceof Error ? e.message.slice(0, 140) : "error");

// TEMPORARY. Reports which settings exist and whether the database matches the app. Delete after use.
export async function GET() {
  const has = (k: string) => Boolean(process.env[k]);
  let host = "not set";
  try {
    host = new URL(process.env.DATABASE_URL ?? "").hostname.slice(0, 14) || "not set";
  } catch {
    host = "invalid url";
  }
  const out: Record<string, unknown> = {
    settings: {
      DATABASE_URL: has("DATABASE_URL"),
      SESSION_SECRET: has("SESSION_SECRET"),
      MPESA_CONSUMER_KEY: has("MPESA_CONSUMER_KEY"),
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: has("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    },
    databaseHostStart: host,
  };
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    out.database = "reachable";
    const cols = await db.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name IN ('preferredName', 'dateOfBirth', 'idNumber')`;
    out.userColumns = cols.map((c) => c.column_name).sort();
    const tabs = await db.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('WeeklyResult', 'StoredFile', 'UserPhoto', 'PushSubscription', 'Passkey')`;
    out.tables = tabs.map((t) => t.table_name).sort();
    out.members = await db.user.count();
  } catch (e) {
    out.problem = why(e);
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
