import { nairobiDayStart } from "@/lib/ai-config";
import { audit } from "@/lib/auth";
import { BIRTHDAY_PATH, birthdayWindow, titleCase } from "@/lib/birthdays";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyMany, notifyOne } from "@/lib/push";

export const maxDuration = 60;

function listNames(list: string[]) {
  if (list.length === 1) return list[0];
  if (list.length <= 3) return list.slice(0, -1).join(", ") + " and " + list[list.length - 1];
  return list.slice(0, 3).join(", ") + " and " + (list.length - 3) + " others";
}

// Runs every morning (see vercel.json). Needs the CRON_SECRET setting.
// Extra options for testing: ?dry=1 shows what would happen, ?to=username sends only to that one member.
export const GET = route(async (req: Request) => {
  const dev = process.env.NODE_ENV !== "production";
  const secret = process.env.CRON_SECRET;
  if (!dev && (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)) {
    throw new HttpError(401, "Not allowed");
  }
  const q = new URL(req.url).searchParams;
  const only = q.get("to");
  const dry = q.has("dry") || (dev && !only); // on your own computer nothing is sent to everyone

  const people = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false, dateOfBirth: { not: null } },
    select: { id: true, fullName: true, dateOfBirth: true },
  });
  const celebrants = people.flatMap((p) =>
    p.dateOfBirth && birthdayWindow(p.dateOfBirth).days === 0 ? [{ id: p.id, name: titleCase(p.fullName) }] : []
  );
  if (celebrants.length === 0) return Response.json({ celebrants: [], note: "No birthdays today" });

  // Each birthday is announced once a day, even if this runs twice
  let fresh = celebrants;
  if (!only) {
    const done = await db.auditLog.findMany({
      where: { action: "BIRTHDAY_ANNOUNCED", actorId: { in: celebrants.map((c) => c.id) }, createdAt: { gte: nairobiDayStart() } },
      select: { actorId: true },
    });
    const doneIds = new Set(done.map((d) => d.actorId));
    fresh = celebrants.filter((c) => !doneIds.has(c.id));
    if (fresh.length === 0) return Response.json({ celebrants: celebrants.map((c) => c.name), note: "Already announced today" });
  }
  const freshIds = fresh.map((c) => c.id);

  let recipients: string[];
  if (only) {
    const u = await db.user.findUnique({ where: { username: only }, select: { id: true } });
    if (!u) throw new HttpError(404, "No member with that username");
    recipients = [u.id];
  } else {
    const rows = await db.user.findMany({
      where: { status: "ACTIVE", isDeveloper: false, id: { notIn: freshIds } },
      select: { id: true },
    });
    recipients = rows.map((r) => r.id);
  }

  const names = fresh.map((c) => c.name);
  const others = {
    title: fresh.length === 1 ? "Birthday today: " + names[0] : "Birthdays today",
    body: fresh.length === 1 ? "Send them a wish on your Overview page." : listNames(names) + " have birthdays today. Send them a wish.",
    url: BIRTHDAY_PATH,
    tag: "birthdays-" + new Date().toISOString().slice(0, 10),
  };

  if (dry) return Response.json({ dry: true, celebrants: names, recipients: recipients.length, notification: others });

  if (!only) {
    for (const c of fresh) await audit(c.id, "BIRTHDAY_ANNOUNCED", "Birthday");
    for (const c of fresh) {
      const first = c.name.split(" ")[0] ?? "friend";
      await notifyOne(c.id, {
        title: "Happy birthday, " + first + "!",
        body: "The whole division wishes you a wonderful day. Your wishes will appear on your Overview.",
        url: BIRTHDAY_PATH,
        tag: "birthday-me",
      });
    }
  }
  await notifyMany(recipients, others);
  return Response.json({ sent: true, celebrants: names, recipients: recipients.length });
});
