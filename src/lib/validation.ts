import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password needs an uppercase letter")
  .regex(/[a-z]/, "Password needs a lowercase letter")
  .regex(/[0-9]/, "Password needs a number");

// Accepts 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX -> stores 2547XXXXXXXX (what M-Pesa wants)
export const phoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .refine((s) => /^(?:\+?254|0)?[71]\d{8}$/.test(s), "Enter a valid Kenyan phone number")
  .transform((s) => "254" + s.slice(-9));

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_]{3,20}$/, "Username: 3-20 letters, numbers or underscores")
  .transform((s) => s.toLowerCase());

export const emailSchema = z.string().trim().email().transform((s) => s.toLowerCase());

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  phone: phoneSchema,
  fullName: z.string().trim().min(2).max(100),
  password: passwordSchema,
  crewId: z.number().int().min(1).max(4),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});
