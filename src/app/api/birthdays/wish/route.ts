import { Prisma } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { BIRTHDAY_PATH, birthdayWindow, titleCase } from "@/lib/birthdays";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyOne } from "@/lib/push";

const body = z.object({
  toUserId: z.string().min(1).max(64),
  message: z.string().trim().min(2, "Write a short message").max(200, "Please keep it under 200 characters"),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  if (actor.isDeveloper) throw new HttpError(403, "Birthday wishes are for members.");
  const d = body.parse(await req.json());
  if (d.toUserId === actor.id) throw new HttpError(400, "You cannot send a wish to yourself.");

  const target = await db.user.findFirst({
    where: { id: d.toUserId, status: "ACTIVE", isDeveloper: false },
    select: { id: true, dateOfBirth: true },
  });
  const w = target?.dateOfBirth ? birthdayWindow(target.dateOfBirth) : null;
  if (!target || !w || w.days !== 0) throw new HttpError(400, "It is not this person's birthday today.");

  try {
    await db.birthdayWish.create({ data: { toUserId: target.id, fromUserId: actor.id, year: w.year, message: d.message } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "You have already sent a wish to this person.");
    }
    throw e;
  }

  const first = titleCase(actor.fullName.trim().split(/\s+/)[0] ?? "A member");
  const text = d.message.length > 100 ? d.message.slice(0, 97) + "..." : d.message;
  after(() => notifyOne(target.id, { title: "Birthday wish from " + first, body: text, url: BIRTHDAY_PATH, tag: "bday-" + actor.id }));
  return Response.json({ ok: true }, { status: 201 });
});
