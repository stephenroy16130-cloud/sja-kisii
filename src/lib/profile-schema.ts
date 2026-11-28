import { z } from "zod";
import { calcAge } from "./profile";
import { emailSchema, phoneSchema } from "./validation";

export const parseDob = (s: string) => {
  const d = new Date(s + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? null : d;
};

export const officialSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(100),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose your date of birth"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"], { errorMap: () => ({ message: "Choose your gender" }) }),
    phone: phoneSchema,
    email: emailSchema,
    idType: z.enum(["NATIONAL_ID", "BIRTH_CERTIFICATE"], {
      errorMap: () => ({ message: "Choose National ID or Birth Certificate" }),
    }),
    idNumber: z.string().trim().toUpperCase().min(1, "Enter your ID number").max(20),
  })
  .superRefine((d, ctx) => {
    const dob = parseDob(d.dateOfBirth);
    if (!dob) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date" });
    } else {
      const age = calcAge(dob);
      if (dob > new Date() || age < 10 || age > 100) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date of birth (age 10 to 100)" });
      }
    }
    const ok =
      d.idType === "NATIONAL_ID" ? /^\d{7,10}$/.test(d.idNumber) : /^[A-Z0-9][A-Z0-9/-]{4,19}$/.test(d.idNumber);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["idNumber"],
        message: d.idType === "NATIONAL_ID" ? "National ID must be 7 to 10 digits" : "Enter a valid birth certificate number",
      });
    }
  });

// Counts what people see as one character, so an emoji counts as 1
const seen = (s: string): number => {
  try {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(s)].length;
  } catch {
    return [...s].length;
  }
};

// Letters, numbers, spaces, . ' - and emojis (with their joiners, skin tones, flags and keycaps)
const NAME_OK = /^[\p{L}\p{N}\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator} .'\-\u200D\uFE0F\u20E3]*$/u;
const HAS_CONTENT = /[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u;

export const socialSchema = z.object({
  preferredName: z
    .string()
    .trim()
    .refine((s) => seen(s) <= 30, "Keep it under 30 characters")
    .refine((s) => NAME_OK.test(s), "Use letters, numbers, spaces, emojis, . ' or - only")
    .refine((s) => s === "" || HAS_CONTENT.test(s), "Use at least one letter, number or emoji")
    .transform((s) => (s.length ? s : null))
    .refine((v) => v === null || seen(v) >= 2, "Use at least 2 characters"),
});
