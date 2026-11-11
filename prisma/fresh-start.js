const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const everything = args.includes("--everything");
const confirm = (args.find((a) => a.startsWith("--confirm=")) || "").slice(10);

function hostStart() {
  try {
    return new URL(process.env.DATABASE_URL || "").hostname.slice(0, 14);
  } catch {
    return "unknown";
  }
}

async function main() {
  const host = hostStart();
  const code = host.slice(0, 8);
  console.log("\nDatabase: " + host + "...");

  const ds = await db.user.findFirst({
    where: { isSuperintendent: true, NOT: { email: { endsWith: "@test.com" } } },
    orderBy: { createdAt: "asc" },
  });
  if (!ds) {
    console.log("No real Divisional Superintendent account was found (one that is not @test.com). Stopping.");
    return;
  }
  console.log("Keeping the Superintendent: " + ds.fullName + " <" + ds.email + ">");

  const doomed = await db.user.findMany({
    where: everything
      ? { id: { not: ds.id }, isDeveloper: false }
      : { email: { endsWith: "@test.com" }, id: { not: ds.id } },
    select: { id: true, fullName: true, email: true },
  });
  const ids = doomed.map((u) => u.id);
  const demo = { title: { startsWith: "[Demo]" } };
  const ev = everything ? {} : demo;
  const [m, f, t] = await Promise.all([
    db.meeting.count({ where: ev }),
    db.fieldOp.count({ where: ev }),
    db.training.count({ where: ev }),
  ]);

  console.log("\nMode: " + (everything ? "EVERYTHING (all members and records, except the Superintendent)" : "TEST DATA ONLY"));
  console.log("Accounts to delete:  " + ids.length);
  doomed.slice(0, 15).forEach((u) => console.log("   - " + u.fullName + " <" + u.email + ">"));
  if (doomed.length > 15) console.log("   ... and " + (doomed.length - 15) + " more");
  console.log("Meetings: " + m + " · Field operations: " + f + " · Training: " + t);

  if (!apply) {
    console.log("\nDRY RUN. Nothing was changed.");
    console.log("To do it for real, add:  --apply --confirm=" + code);
    return;
  }
  if (confirm !== code) {
    console.log("\nNot done. Add --confirm=" + code + " to confirm this is the database you mean.");
    return;
  }

  await db.$transaction(
    async (tx) => {
      if (everything) {
        await tx.attendanceRecord.deleteMany({});
        await tx.checkIn.deleteMany({});
        await tx.apology.deleteMany({});
        await tx.eventLink.deleteMany({});
        await tx.meeting.deleteMany({});
        await tx.fieldOp.deleteMany({});
        await tx.training.deleteMany({});
        await tx.transaction.deleteMany({});
        await tx.order.deleteMany({});
        await tx.collection.deleteMany({});
        await tx.announcement.deleteMany({});
        await tx.membershipRequest.deleteMany({});
        await tx.item.deleteMany({});
        await tx.article.deleteMany({});
        await tx.document.deleteMany({});
        await tx.storedFile.deleteMany({});
        await tx.instrumentIssuanceLog.deleteMany({});
        await tx.bandInstrument.deleteMany({});
        await tx.weeklyResult.deleteMany({});
        await tx.notification.deleteMany({});
        await tx.pushSubscription.deleteMany({});
        await tx.auditLog.deleteMany({});
        await tx.user.deleteMany({ where: { id: { in: ids } } });
        await tx.systemSetting.deleteMany({});
        await tx.systemSetting.create({ data: { key: "registrationOpen", value: false } });
        await tx.crew.updateMany({ data: { whatsappLink: null } });
        await tx.auditLog.create({ data: { actorId: ds.id, action: "FRESH_START", entity: "System" } });
      } else {
        const to = { in: ids };
        // Anything a test account created stays, and moves to the real Superintendent
        await tx.meeting.updateMany({ where: { createdById: to }, data: { createdById: ds.id } });
        await tx.fieldOp.updateMany({ where: { createdById: to }, data: { createdById: ds.id } });
        await tx.training.updateMany({ where: { createdById: to }, data: { createdById: ds.id } });
        await tx.announcement.updateMany({ where: { createdById: to }, data: { createdById: ds.id } });
        await tx.article.updateMany({ where: { authorId: to }, data: { authorId: ds.id } });
        await tx.document.updateMany({ where: { uploadedById: to }, data: { uploadedById: ds.id } });
        await tx.attendanceRecord.updateMany({ where: { recordedById: to }, data: { recordedById: ds.id } });
        await tx.membershipRequest.updateMany({ where: { requestedById: to }, data: { requestedById: ds.id } });
        await tx.instrumentIssuanceLog.updateMany({ where: { issuedById: to }, data: { issuedById: ds.id } });
        await tx.collection.updateMany({ where: { createdById: to }, data: { createdById: ds.id } });

        // The demo events, with their attendance and links
        const ids2 = async (model) => (await model.findMany({ where: demo, select: { id: true } })).map((x) => x.id);
        const evIds = [...(await ids2(tx.meeting)), ...(await ids2(tx.fieldOp)), ...(await ids2(tx.training))];
        if (evIds.length) await tx.eventLink.deleteMany({ where: { eventId: { in: evIds } } });
        await tx.meeting.deleteMany({ where: demo });
        await tx.fieldOp.deleteMany({ where: demo });
        await tx.training.deleteMany({ where: demo });

        // The test accounts' own records, then the accounts
        await tx.transaction.deleteMany({ where: { userId: to } });
        await tx.order.deleteMany({ where: { userId: to } });
        await tx.attendanceRecord.deleteMany({ where: { userId: to } });
        await tx.apology.deleteMany({ where: { userId: to } });
        await tx.announcementRsvp.deleteMany({ where: { userId: to } });
        await tx.membershipRequest.deleteMany({ where: { targetUserId: to } });
        await tx.instrumentIssuanceLog.deleteMany({ where: { issuedToId: to } });
        await tx.weeklyResult.deleteMany({}); // trophies are worked out again from the real data
        await tx.user.deleteMany({ where: { id: to } });
      }
    },
    { timeout: 120_000, maxWait: 20_000 }
  );

  console.log("\nDone.");
  if (everything) {
    console.log("Next: sign in as the Superintendent, open People, and create the DO Admin account.");
    console.log("The DO Admin then opens registration and promotes the other leaders.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
