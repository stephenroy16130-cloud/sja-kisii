import { randomBytes } from "crypto";
import type { EventType } from "@prisma/client";
import { headers } from "next/headers";
import { db } from "./db";
import { can, type AuthUser } from "./rbac";

export type QrKind = "meeting" | "fieldop" | "training";
export const QR_KINDS = ["meeting", "fieldop", "training"] as const;
export const EVENT_TYPE: Record<QrKind, EventType> = { meeting: "MEETING", fieldop: "FIELD_OP", training: "TRAINING" };
export const KIND_LABEL: Record<QrKind, string> = { meeting: "Meeting", fieldop: "Field operation", training: "Training" };

// The first letter of a code says which kind of event it belongs to
const PREFIX: Record<QrKind, string> = { meeting: "M", fieldop: "F", training: "T" };
const BY_PREFIX: Record<string, QrKind> = { M: "meeting", F: "fieldop", T: "training" };

export const makeToken = (k: QrKind) => PREFIX[k] + randomBytes(18).toString("base64url");
export function kindOfToken(t: string): QrKind | null {
  return /^[MFT][A-Za-z0-9_-]{20,40}$/.test(t) ? BY_PREFIX[t[0]] : null;
}

export async function siteOrigin() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

export type QrEvent = {
  kind: QrKind;
  id: string;
  title: string;
  startsAt: Date;
  qrToken: string | null;
  qrActivatesAt: Date | null;
  qrExpiresAt: Date | null;
  createdById: string;
  crewIds: number[] | null; // crews the event is for. null means everyone.
  blocked: string | null; // a reason this event cannot take check-ins
  bandOnly: boolean; // a band practice: only band members attend
};
type Key = { id: string } | { token: string };

export async function loadEvent(kind: QrKind, key: Key): Promise<QrEvent | null> {
  if (kind === "meeting") {
    const m = await db.meeting.findUnique({ where: "id" in key ? { id: key.id } : { qrToken: key.token } });
    if (!m) return null;
    return {
      kind, id: m.id, title: m.title, startsAt: m.startsAt,
      qrToken: m.qrToken, qrActivatesAt: m.qrActivatesAt, qrExpiresAt: m.qrExpiresAt,
      createdById: m.createdById, crewIds: null,
      blocked: m.archivedAt ? "This meeting has been archived." : null,
      bandOnly: false,
    };
  }
  if (kind === "fieldop") {
    const o = await db.fieldOp.findUnique({
      where: "id" in key ? { id: key.id } : { qrToken: key.token },
      include: { crews: { select: { id: true } } },
    });
    if (!o) return null;
    return {
      kind, id: o.id, title: o.title, startsAt: o.startsAt,
      qrToken: o.qrToken, qrActivatesAt: o.qrActivatesAt, qrExpiresAt: o.qrExpiresAt,
      createdById: o.createdById, crewIds: o.allCrews ? null : o.crews.map((c) => c.id), blocked: o.archivedAt ? "This operation has been archived." : null,
      bandOnly: false,
    };
  }
  const t = await db.training.findUnique({ where: "id" in key ? { id: key.id } : { qrToken: key.token } });
  if (!t) return null;
  return {
    kind, id: t.id, title: t.title, startsAt: t.heldAt,
    qrToken: t.qrToken, qrActivatesAt: t.qrActivatesAt, qrExpiresAt: t.qrExpiresAt,
    createdById: t.createdById, crewIds: t.crewId === null ? null : [t.crewId],
    blocked: t.status === "REJECTED" ? "This training record was rejected." : t.archivedAt ? "This session has been archived." : null,
    bandOnly: t.type === "BAND",
  };
}

export async function updateQr(
  kind: QrKind,
  id: string,
  data: { qrToken?: string | null; qrActivatesAt?: Date | null; qrExpiresAt?: Date | null }
) {
  if (kind === "meeting") await db.meeting.update({ where: { id }, data });
  else if (kind === "fieldop") await db.fieldOp.update({ where: { id }, data });
  else await db.training.update({ where: { id }, data });
}

// The DO who owns that kind of event (and the creator of a training record) controls the code and its times
export function canManageQr(u: AuthUser, e: QrEvent) {
  if (e.kind === "meeting") return can(u, "meeting:manage");
  if (e.kind === "fieldop") return can(u, "fieldop:manage");
  return can(u, "training:verify") || e.createdById === u.id || (e.bandOnly && can(u, "band:issue_instruments"));
}
// Sergeants and Corporals of an eligible crew can download, print and verify their own crew
export function crewLeaderFor(u: AuthUser, e: QrEvent) {
  return !e.bandOnly && can(u, "crew:record_attendance") && u.crewId !== null && (e.crewIds === null || e.crewIds.includes(u.crewId));
}
export const canViewQr = (u: AuthUser, e: QrEvent) => canManageQr(u, e) || crewLeaderFor(u, e);
export function canVerifyFor(u: AuthUser, e: QrEvent, memberCrewId: number | null) {
  if (canManageQr(u, e)) return true;
  return can(u, "crew:record_attendance") && u.crewId !== null && u.crewId === memberCrewId;
}

export type WindowState = "OFF" | "NOT_SET" | "EARLY" | "OPEN" | "CLOSED";
export function windowState(
  e: Pick<QrEvent, "qrToken" | "qrActivatesAt" | "qrExpiresAt">,
  now = new Date()
): WindowState {
  if (!e.qrToken) return "OFF";
  if (!e.qrActivatesAt || !e.qrExpiresAt) return "NOT_SET";
  if (now < e.qrActivatesAt) return "EARLY";
  if (now >= e.qrExpiresAt) return "CLOSED";
  return "OPEN";
}

export async function titlesFor(rows: { kind: EventType; eventId: string }[]) {
  const ids = (k: EventType) => [...new Set(rows.filter((r) => r.kind === k).map((r) => r.eventId))];
  const [m, f, t] = await Promise.all([
    db.meeting.findMany({ where: { id: { in: ids("MEETING") } }, select: { id: true, title: true, startsAt: true } }),
    db.fieldOp.findMany({ where: { id: { in: ids("FIELD_OP") } }, select: { id: true, title: true, startsAt: true } }),
    db.training.findMany({ where: { id: { in: ids("TRAINING") } }, select: { id: true, title: true, heldAt: true } }),
  ]);
  const out = new Map<string, { title: string; date: Date }>();
  m.forEach((x) => out.set(`MEETING:${x.id}`, { title: x.title, date: x.startsAt }));
  f.forEach((x) => out.set(`FIELD_OP:${x.id}`, { title: x.title, date: x.startsAt }));
  t.forEach((x) => out.set(`TRAINING:${x.id}`, { title: x.title, date: x.heldAt }));
  return out;
}
