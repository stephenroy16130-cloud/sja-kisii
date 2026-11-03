import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { route } from "@/lib/http";
import { rp, saveChallenge } from "@/lib/webauthn";

// Public: it only hands out a one-time challenge
export const POST = route(async () => {
  const { id: rpID } = await rp();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  await saveChallenge("auth", options.challenge);
  return Response.json(options);
});
