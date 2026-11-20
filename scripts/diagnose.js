const { PrismaClient, Prisma } = require("@prisma/client");
const db = new PrismaClient();
const lower = (s) => s[0].toLowerCase() + s.slice(1);

(async () => {
  try {
    console.log("Database: " + new URL(process.env.DATABASE_URL).hostname.slice(0, 24) + "...");
  } catch {
    console.log("DATABASE_URL is missing or invalid.");
    return;
  }
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    console.log("CANNOT REACH THE DATABASE (" + (e.code || "error") + "). Switch to the phone hotspot and run this again.");
    return;
  }

  let bad = 0;
  for (const name of Object.keys(Prisma.ModelName)) {
    try {
      await db[lower(name)].findFirst();
    } catch (e) {
      bad++;
      const where = e.meta && (e.meta.column || e.meta.table || e.meta.modelName);
      console.log("PROBLEM  " + name + ": " + (e.code || "error") + (where ? " (" + where + ")" : ""));
    }
  }
  console.log(
    bad
      ? "\n" + bad + " table(s) are behind the code. That is what breaks login."
      : "\nEvery table matches the code, so the login error is something else."
  );
})()
  .catch((e) => console.error(e.message))
  .finally(() => db.$disconnect());
