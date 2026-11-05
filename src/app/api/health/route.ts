export const dynamic = "force-dynamic";

const why = (e: unknown) => (e as { code?: string }).code ?? (e instanceof Error ? e.message.slice(0, 140) : "error");

// TEMPORARY. Says which settings exist and whether the database matches the app. Delete after use.
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
      BLOB_READ_WRITE_TOKEN: has("BLOB_READ_WRITE_TOKEN"),
    },
    databaseHostStart: host,
  };
  try {
    const { db } = await import("@/lib/db");
    await db.$queryRaw`SELECT 1`;
    out.database = "reachable";
    const pages: Record<string, string> = {};
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        pages[name] = "ok";
      } catch (e) {
        pages[name] = why(e);
      }
    };
    await run("users", () => db.user.findFirst());
    await run("meetings", () => db.meeting.findFirst());
    await run("fieldOps", () => db.fieldOp.findFirst());
    await run("training", () => db.training.findFirst());
    await run("checkIns", () => db.checkIn.findFirst());
    out.pages = pages;
  } catch (e) {
    out.problem = why(e);
  }
  return Response.json(out, { headers: { "Cache-Control": "no-store" } });
}
