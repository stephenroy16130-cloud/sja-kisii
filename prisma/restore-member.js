const { PrismaClient, Prisma } = require("@prisma/client");
const db = new PrismaClient();

(async () => {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const apply = process.argv.includes("--apply");
  const si = process.argv.indexOf("--status");
  const next = si > 0 ? process.argv[si + 1] : null;
  if (!email || email.startsWith("--")) {
    console.log('Usage: node --env-file=.env prisma/restore-member.js member@email.com [--status PENDING_VALUE --apply]');
    return;
  }

  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "User");
  const enumName = model.fields.find((f) => f.name === "status").type;
  const values = (Prisma.dmmf.datamodel.enums.find((e) => e.name === enumName) || { values: [] }).values.map((v) => v.name);
  console.log("Status values in your database: " + values.join(", "));

  const u = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, fullName: true, username: true, status: true, crewId: true, approvedById: true, crewApprovedById: true },
  });
  if (!u) return console.log("No account with that email.");

  console.log("\nFound: " + u.fullName + " (username " + u.username + ")");
  console.log("Status now: " + u.status + " | crew: " + (u.crewId || "none") + " | admin approval: " + (u.approvedById ? "yes" : "no") + " | crew approval: " + (u.crewApprovedById ? "yes" : "no"));

  if (!next) return console.log("\nDRY RUN. Re-run with --status <one of the values above> --apply to change it.");
  if (!values.includes(next)) return console.log("'" + next + "' is not a valid status. Choose from: " + values.join(", "));
  if (!apply) return console.log("\nDRY RUN. Would change " + u.status + " -> " + next + ". Add --apply to do it.");

  await db.user.update({ where: { id: u.id }, data: { status: next } });
  console.log("\nChanged " + u.status + " -> " + next + ".");
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
