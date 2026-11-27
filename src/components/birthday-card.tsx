import { getCurrentUser } from "@/lib/auth";
import { birthdayWindow, titleCase } from "@/lib/birthdays";
import { crewColor, crewName } from "@/lib/crews";
import { db } from "@/lib/db";
import BirthdayPanel from "./birthday-panel";

// Birthdays today (Nairobi). Only the day and month are used. The year and age are never shown.
export default async function BirthdayCard() {
  const user = await getCurrentUser();
  if (!user || user.isDeveloper) return null;

  const people = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false, dateOfBirth: { not: null } },
    select: { id: true, fullName: true, dateOfBirth: true, crewId: true },
  });
  const hasDob = people.some((p) => p.id === user.id);

  const today = people.flatMap((p) => {
    if (!p.dateOfBirth) return [];
    const w = birthdayWindow(p.dateOfBirth);
    return w.days === 0 ? [{ id: p.id, name: titleCase(p.fullName), crewId: p.crewId, year: w.year }] : [];
  });
  if (today.length === 0) return null; // no birthdays today, so no card

  try {
    await db.birthdayWish.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 60 * 86_400_000) } } });
  } catch {
    // not important
  }

  const year = today[0].year;
  const wishes = await db.birthdayWish.findMany({
    where: { toUserId: { in: today.map((t) => t.id) }, year },
    orderBy: { createdAt: "desc" },
    select: { id: true, toUserId: true, fromUserId: true, message: true, createdAt: true },
  });

  // Only the birthday member can read the messages
  const mine = today.find((t) => t.id === user.id);
  const mineRows = mine ? wishes.filter((w) => w.toUserId === user.id) : [];
  const senderIds = [...new Set(mineRows.map((w) => w.fromUserId))];
  const senders = senderIds.length
    ? await db.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, fullName: true } })
    : [];
  const names = new Map<string, string>(senders.map((s) => [s.id, titleCase(s.fullName)] as [string, string]));

  return (
    <BirthdayPanel
      dateLabel={new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Nairobi" })}
      celebrating={today
        .filter((t) => t.id !== user.id)
        .map((t) => {
          const forThem = wishes.filter((w) => w.toUserId === t.id);
          return {
            id: t.id,
            name: t.name,
            crew: t.crewId ? crewName(t.crewId) : "",
            color: crewColor(t.crewId),
            count: forThem.length,
            wished: forThem.some((w) => w.fromUserId === user.id),
          };
        })}
      me={{
        id: user.id,
        fullName: titleCase(user.fullName),
        crew: mine?.crewId ? crewName(mine.crewId) : "",
        color: crewColor(mine?.crewId ?? null),
        firstName: titleCase(user.fullName.trim().split(/\s+/)[0] ?? ""),
        hasDob,
        celebrating: Boolean(mine),
        wishes: mineRows.map((w) => ({
          id: w.id,
          fromId: w.fromUserId,
          from: names.get(w.fromUserId) ?? "A member",
          message: w.message,
          at: w.createdAt.toISOString(),
        })),
      }}
    />
  );
}
