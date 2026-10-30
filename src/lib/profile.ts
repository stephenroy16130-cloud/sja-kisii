import type { Gender, IdType } from "@prisma/client";

export const GENDER_LABEL: Record<Gender, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };
export const ID_LABEL: Record<IdType, string> = { NATIONAL_ID: "National ID", BIRTH_CERTIFICATE: "Birth Certificate" };

// Public name: the preferred name if there is one, otherwise the full name
export const displayName = (u: { fullName: string; preferredName: string | null }) =>
  u.preferredName?.trim() || u.fullName;

// Social photo is visible to every signed-in member
export const socialPhoto = (u: { id: string; socialPhotoAt: Date | null }) =>
  u.socialPhotoAt ? `/api/photos/${u.id}/social?v=${u.socialPhotoAt.getTime()}` : null;

// Official photo is private: only the owner and the DO Admin can open it
export const officialPhoto = (u: { id: string; officialPhotoAt: Date | null }) =>
  u.officialPhotoAt ? `/api/photos/${u.id}/official?v=${u.officialPhotoAt.getTime()}` : null;

export function calcAge(dob: Date, now = new Date()) {
  const years = now.getUTCFullYear() - dob.getUTCFullYear();
  const months = now.getUTCMonth() - dob.getUTCMonth();
  return months < 0 || (months === 0 && now.getUTCDate() < dob.getUTCDate()) ? years - 1 : years;
}

export const REPORT_KEYS = [
  "fullName", "dateOfBirth", "age", "gender", "phone", "email", "idType", "idNumber", "crew", "titles",
] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export const REPORT_FIELDS: { key: ReportKey; label: string; group: string; on: boolean }[] = [
  { key: "fullName", label: "Full Name", group: "Official details", on: true },
  { key: "dateOfBirth", label: "Date of Birth", group: "Official details", on: false },
  { key: "age", label: "Age", group: "Official details", on: false },
  { key: "gender", label: "Gender", group: "Official details", on: false },
  { key: "phone", label: "Phone Number", group: "Official details", on: true },
  { key: "email", label: "Email", group: "Official details", on: false },
  { key: "idType", label: "Identity Type", group: "Official details", on: false },
  { key: "idNumber", label: "ID Number", group: "Official details", on: true },
  { key: "crew", label: "Crew", group: "Membership", on: false },
  { key: "titles", label: "Leadership Titles", group: "Membership", on: false },
];
