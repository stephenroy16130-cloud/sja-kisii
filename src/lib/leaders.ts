import type { Title } from "@prisma/client";

// Every leadership post. Band Member is a role in the band, not a leadership post.
export const LEADER_TITLES: Title[] = [
  "CORPORAL",
  "SERGEANT",
  "DSM",
  "BAND_LEAD",
  "DO_OPERATIONS",
  "DO_TRAINING",
  "DO_ADMIN",
  "DO_FINANCE",
];

export const isLeaderUser = (u: { titles: string[]; isSuperintendent: boolean }) =>
  u.isSuperintendent || u.titles.some((t) => t !== "BAND_MEMBER");
