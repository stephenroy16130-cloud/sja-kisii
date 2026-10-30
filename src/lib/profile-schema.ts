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
      d.idType === "NATIONAL_ID" ? /^\d{7,8}$/.test(d.idNumber) : /^[A-Z0-9][A-Z0-9/-]{4,19}$/.test(d.idNumber);
    if (!ok) {
      ctx.addIssue({
        code: "custom",
        path: ["idNumber"],
        message: d.idType === "NATIONAL_ID" ? "National ID must be 7 or 8 digits" : "Enter a valid birth certificate number",
      });
    }
  });

export const socialSchema = z.object({
  preferredName: z
    .string()
    .trim()
    .max(30, "Keep it under 30 characters")
    .regex(/^[\p{L}\p{N} .'-]*$/u, "Use letters, numbers, spaces, . ' or - only")
    .transform((s) => (s.length ? s : null))
    .refine((v) => v === null || v.length >= 2, "Use at least 2 characters"),
});
