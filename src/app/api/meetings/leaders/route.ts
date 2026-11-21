import type { Prisma } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { fmt } from "@/lib/meetings";
import { notifyLeaders } from "@/lib/push";
import { hasField } from "@/lib/schema-info";

const head = z.object({ title: z.string().trim().min(3, "Title is too short").max(150), startsAt: z.string().datetime() });
const TEXT = ["description", "location", "venue", "notes"];

// A meeting only leaders can see. Everything else on the form is copied across as it is.
export const POST = route(async (req: Request) => {
  const actor = await requirePermission("meeting:manage");
  const raw = (await req.json()) as Record<string, unknown>;
  const d = head.parse(raw);

  const data: Record<string, unknown> = {
    title: d.title,
    startsAt: new Date(d.startsAt),
    createdById: actor.id,
    leadersOnly: true,
  };
  for (const k of TEXT) {
    if (hasField("Meeting", k)) data[k] = typeof raw[k] === "string" ? (raw[k] as string).trim() : "";
  }
  if (hasField("Meeting", "endsAt") && typeof raw.endsAt === "string" && raw.endsAt) {
    data.endsAt = new Date(raw.endsAt);
  }

  const meeting = await db.meeting.create({
    data: data as Prisma.MeetingUncheckedCreateInput,
    select: { id: true, title: true },
  });
  await audit(actor.id, "MEETING_CREATED", "Meeting", meeting.id, { title: meeting.title, leadersOnly: true });

  after(() =>
    notifyLeaders(
      {
        title: "New leaders' meeting: " + meeting.title,
        body: fmt(new Date(d.startsAt)),
        url: "/dashboard/meetings/" + meeting.id,
        tag: "event-" + meeting.id,
      },
      actor.id
    )
  );
  return Response.json(meeting, { status: 201 });
});
