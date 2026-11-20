import { z } from "zod";

// Saved in capitals with single spaces, for example SC211/1234/2022
export const admissionSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, " ").toUpperCase())
  .refine((s) => /^[A-Z0-9][A-Z0-9/\-. ]{2,28}[A-Z0-9]$/.test(s), "Use letters, numbers, / and - only, for example SC211/1234/2022");

// An empty box clears the number
export const admissionOrEmpty = z.union([z.literal(""), admissionSchema]);
