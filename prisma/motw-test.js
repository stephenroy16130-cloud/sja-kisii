const { PrismaClient, Prisma } = require("@prisma/client");
const db = new PrismaClient();

(async () => {
  const email = (process.argv[2] || "").toLowerCase();
  const assign = process.argv.includes("--assign");
  if (!email) {
    console.log("Usage: node --env-file=.env prisma/motw-test.js member1@test.com [--assign]");
    return;
  }

  const fields = Object.keys(Prisma.WeeklyResultScalarFieldEnum || {});
  const field = ["winnerId", "userId"].find((f) => fields.includes(f));
  if (!field) {
    console.log("Could not find the winner column. WeeklyResult has: " + fields.join(", "));
    return;
  }
  if (assign && !email.endsWith("@test.com")) {
    console.log("--assign only works for @test.com accounts.");
    return;
  }

  const user = await db.user.findUnique({ where: { email }, select: { id: true, fullName: true } });
  if (!user) {
    console.log("No user with that email.");
    return;
  }

  // Without --assign this replays a real win. With --assign it hands the latest week to a test account.
  const latest = await db.weeklyResult.findFirst({
    where: assign ? {} : { [field]: user.id },
    orderBy: { weekStart: "desc" },
  });
  if (!latest) {
    console.log(
      assign
        ? "No weekly result exists yet. Open the Overview after a week with attendance so one is created."
        : user.fullName + " has not won a week. Add --assign to make this test account the latest winner."
    );
    return;
  }

  await db.weeklyResult.update({
    where: { id: latest.id },
    data: { ...(assign ? { [field]: user.id } : {}), isMotwRevealed: false },
  });
  const days = Math.round((Date.now() - new Date(latest.weekStart).getTime()) / 86_400_000);
  console.log((assign ? "Made " + user.fullName + " the latest winner, and " : "") + "reset the reveal for " + user.fullName + ".");
  console.log("Now sign in as them and open the Overview.");
  if (days > 28) console.log("Note: that week is " + days + " days old, which is too old to trigger a reveal.");
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
