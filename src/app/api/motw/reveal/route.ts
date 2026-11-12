import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST() {
  const user = await requireUser(); // throws 401 if not authenticated
  await db.user.update({
    where: { id: user.id },
    data: { hasSeenMotw: true },
  });
  return NextResponse.json({ ok: true });
}

