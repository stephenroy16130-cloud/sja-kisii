import type { EventType } from "@prisma/client";
import { db } from "./db";
import { BAND_POINTS, FIELD_OP_POINTS, MEETING_POINTS, TRAINING_POINTS } from "./points";

export type ServicePointsData = {
  total: number;
  meetings: number;
  fieldOps: number;
  training: number;
  band: number;
};

// Everything a member has earned by attending, since they joined. Two cheap queries.
export async function servicePoints(userId: string): Promise<ServicePointsData> {
  const [rows, bandCount] = await Promise.all([
    db.attendanceRecord.groupBy({
      by: ["eventType"],
      where: {
        userId,
        status: "PRESENT",
        OR: [
          { eventType: "MEETING" },
          { eventType: "FIELD_OP" },
          { eventType: "TRAINING", training: { status: "VERIFIED", type: { not: "BAND" } } },
        ],
      },
      _count: { _all: true },
    }),
    db.attendanceRecord.count({
      where: { userId, status: "PRESENT", eventType: "TRAINING", training: { type: "BAND", status: "VERIFIED" } },
    }),
  ]);
  const n = (t: EventType) => rows.find((r) => r.eventType === t)?._count._all ?? 0;
  const meetings = n("MEETING") * MEETING_POINTS;
  const fieldOps = n("FIELD_OP") * FIELD_OP_POINTS;
  const training = n("TRAINING") * TRAINING_POINTS;
  const band = bandCount * BAND_POINTS;
  return { total: meetings + fieldOps + training + band, meetings, fieldOps, training, band };
}
