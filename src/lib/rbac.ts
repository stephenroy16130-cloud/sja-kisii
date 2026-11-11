import type { Title, UserStatus } from "@prisma/client";

export type Permission =
  | "dev:bootstrap"
  | "user:manage_titles"
  | "user:provision"
  | "user:appoint_admin"
  | "user:approve_registration"
  | "user:manage_accounts"
  | "crew:approve_members"
  | "crew:record_attendance"
  | "crew:request_membership_change"
  | "crew:approve_membership_change"
  | "crew:create_announcement"
  | "meeting:manage"
  | "fieldop:manage"
  | "training:create_first_aid"
  | "training:create_drill"
  | "training:verify"
  | "band:issue_instruments"
  | "band:oversee"
  | "finance:manage"
  | "content:create"
  | "content:moderate";

const CREW_LEADER: Permission[] = [
  "crew:approve_members",
  "crew:record_attendance",
  "crew:request_membership_change",
  "crew:create_announcement",
  "training:create_first_aid",
  "content:create",
];

export const TITLE_PERMISSIONS: Record<Title, Permission[]> = {
  CORPORAL: CREW_LEADER,
  SERGEANT: CREW_LEADER,
  DSM: ["training:create_drill", "content:create"],
  BAND_LEAD: ["band:issue_instruments", "content:create"],
  BAND_MEMBER: [],
  DO_OPERATIONS: ["fieldop:manage", "content:create"],
  DO_TRAINING: ["training:verify", "band:oversee", "content:create"],
  DO_ADMIN: [
    "user:approve_registration",
    "user:manage_accounts",
    "user:manage_titles",
    "user:provision",
    "meeting:manage",
    "crew:approve_membership_change",
    "content:create",
    "content:moderate",
  ],
  DO_FINANCE: ["finance:manage", "content:create"],
};

// The Superintendent appoints or replaces the DO Admin. The DO Admin promotes every other leader.
const SUPERINTENDENT: Permission[] = ["user:appoint_admin", "content:create"];

export type AuthUser = {
  id: string;
  status: UserStatus;
  titles: Title[];
  isSuperintendent: boolean;
  isDeveloper: boolean;
  crewId: number | null;
};

export function permissionsFor(user: AuthUser): Set<Permission> {
  if (user.isDeveloper) return new Set<Permission>(["dev:bootstrap"]);
  const perms = new Set<Permission>();
  if (user.isSuperintendent) SUPERINTENDENT.forEach((p) => perms.add(p));
  for (const t of user.titles) TITLE_PERMISSIONS[t].forEach((p) => perms.add(p));
  return perms;
}

export const can = (user: AuthUser, p: Permission) => permissionsFor(user).has(p);
export const hasTitle = (user: AuthUser, t: Title) => user.titles.includes(t);
