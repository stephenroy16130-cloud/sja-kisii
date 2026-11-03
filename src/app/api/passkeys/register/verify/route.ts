import { Prisma } from "@prisma/client";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { deviceLabel, rp, takeChallenge } from "@/lib/webauthn";

const MAX_PASSKEYS = 5;

const schema = z.object({
  response: z.custom<RegistrationResponseJSON>(
    (v) => typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string"
  ),
  name: z.string().trim().max(60).optional(),
});

export const POST = route(async (req: Request) => {
  const actor = await requireUser();
  const { response, name } = schema.parse(await req.json());

  if ((await db.passkey.count({ where: { userId: actor.id } })) >= MAX_PASSKEYS) {
    throw new HttpError(409, `You can register up to ${MAX_PASSKEYS} devices. Remove one first.`);
  }

  const challenge = await takeChallenge("reg", actor.id);
  const { id: rpID, origin } = await rp();

  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    throw new HttpError(400, "Could not verify this device. Please try again.");
  }
  if (!verified.verified || !verified.registrationInfo) throw new HttpError(400, "Could not verify this device.");

  const c = verified.registrationInfo.credential;
  try {
    await db.passkey.create({
      data: {
        id: c.id,
        userId: actor.id,
        publicKey: new Uint8Array(c.publicKey),
        counter: c.counter,
        transports: (c.transports ?? []) as string[],
        deviceName: name || deviceLabel(req.headers.get("user-agent")),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "This device is already registered.");
    }
    throw e;
  }

  await audit(actor.id, "PASSKEY_ADDED", "Passkey", c.id);
  return Response.json({ ok: true }, { status: 201 });
});
