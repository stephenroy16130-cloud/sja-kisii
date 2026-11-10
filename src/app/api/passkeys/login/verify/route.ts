import { verifyAuthenticationResponse, type AuthenticationResponseJSON, type WebAuthnCredential } from "@simplewebauthn/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { createSession } from "@/lib/session";
import { rp, takeChallenge } from "@/lib/webauthn";

const schema = z.object({
  response: z.custom<AuthenticationResponseJSON>(
    (v) => typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string"
  ),
});

export const POST = route(async (req: Request) => {
  const { response } = schema.parse(await req.json());
  const challenge = await takeChallenge("auth");

  const pk = await db.passkey.findUnique({
    where: { id: response.id },
    include: { user: { select: { id: true, status: true, isDeveloper: true, hasCompletedOnboarding: true } } },
  });
  if (!pk || pk.user.isDeveloper) {
    throw new HttpError(401, "This device is not registered. Sign in with your password, then add it in My profile.");
  }

  const { id: rpID, origin } = await rp();
  let result;
  try {
    result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: pk.id,
        publicKey: new Uint8Array(pk.publicKey),
        counter: pk.counter,
        transports: pk.transports as NonNullable<WebAuthnCredential["transports"]>,
      },
      requireUserVerification: true,
    });
  } catch {
    throw new HttpError(401, "Fingerprint sign-in failed. Please try again.");
  }
  if (!result.verified) throw new HttpError(401, "Fingerprint sign-in failed. Please try again.");

  if (pk.user.status !== "ACTIVE") throw new HttpError(403, "This account is disabled.");

  await db.passkey.update({
    where: { id: pk.id },
    data: { counter: result.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });
  await createSession(pk.user.id);
  return Response.json({
    ok: true,
    hasCompletedOnboarding: pk.user.hasCompletedOnboarding,
    has_completed_onboarding: pk.user.hasCompletedOnboarding,
  });
});
