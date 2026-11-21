const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

(async () => {
  const apply = process.argv.includes("--apply");
  const total = await db.user.count({ where: { isDeveloper: false } });
  const seen = await db.user.count({ where: { isDeveloper: false, hasCompletedOnboarding: true } });
  console.log(total + " people. " + seen + " have already finished or skipped the tour.");
  if (!apply) {
    console.log("DRY RUN. Add --apply to make everyone see the tour again from slide 1.");
    return;
  }
  const r = await db.user.updateMany({ where: { isDeveloper: false }, data: { hasCompletedOnboarding: false } });
  console.log("Reset for " + r.count + " people. They will see the tour the next time they open the app.");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
