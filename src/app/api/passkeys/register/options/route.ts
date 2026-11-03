import { generateRegistrationOptions, type WebAuthnCredential } from "@simplewebauthn/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { route } from "@/lib/http";
import { RP_NAME, rp, saveChallenge } from "@/lib/webauthn";

export const POST = route(async () => {
  const actor = await requireUser();
  const { id: rpID } = await rp();
  const existing = await db.passkey.findMany({ where: { userId: actor.id }, select: { id: true, transports: true } });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: actor.username,
    userDisplayName: actor.fullName,
    userID: new Uint8Array(new TextEncoder().encode(actor.id)),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.id,
      transports: p.transports as NonNullable<WebAuthnCredential["transports"]>,
    })),
    authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
  });

  await saveChallenge("reg", options.challenge, actor.id);
  return Response.json(options);
});
