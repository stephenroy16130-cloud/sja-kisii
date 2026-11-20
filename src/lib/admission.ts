import { z } from "zod";

// Formats admission numbers to always end with the 2-digit year, for example /26 rather than /2026
export function formatAdmissionNumber(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .replace(/\/20(\d{2})$/, "/$1")
    .replace(/\/19(\d{2})$/, "/$1");
}

// Saved in capitals with single spaces, ending with the 2-digit year, for example SC211/1234/26
export const admissionSchema = z
  .string()
  .trim()
  .transform(formatAdmissionNumber)
  .refine(
    (s) => /^[A-Z0-9][A-Z0-9/\-. ]{2,28}[A-Z0-9]$/.test(s),
    "Use letters, numbers, / and - only, ending with the 2-digit year, for example SC211/1234/26"
  );

// An empty box clears the number
export const admissionOrEmpty = z.union([z.literal(""), admissionSchema]);
