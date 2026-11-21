import { z } from "zod";

export const ADMISSION_HINT = "End it with the year as two digits, for example SC211/1234/26";

// Capitals and single spaces. A four-digit year at the end becomes two digits: /2026 becomes /26
export function normalizeAdmission(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase().replace(/\/(?:19|20)(\d{2})$/, "/$1");
}
export const isValidAdmission = (s: string) => s.length <= 30 && /^[A-Z0-9][A-Z0-9/\-. ]*\/\d{2}$/.test(s);

export const admissionSchema = z.string().trim().transform(normalizeAdmission).refine(isValidAdmission, ADMISSION_HINT);
// An empty box clears the number
export const admissionOrEmpty = z
  .string()
  .trim()
  .transform(normalizeAdmission)
  .refine((s) => s === "" || isValidAdmission(s), ADMISSION_HINT);
