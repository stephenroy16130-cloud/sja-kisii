import type { Audience } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { canManageInventory, inBand } from "./band";
import { crewName } from "./crews";
import { can, type AuthUser } from "./rbac";

export const MAX_IMAGES = 4;
export const MAX_IMAGE_BYTES = 600_000;
export const MAX_DOC_BYTES = 4_000_000;

export const canModerate = (u: AuthUser) => can(u, "content:moderate");
export const seesBand = (u: AuthUser) => inBand(u) || canManageInventory(u) || canModerate(u);

// Where this person may post: General always, their own crew (any crew for the DO Admin), the Band for band leaders
export function postable(u: AuthUser) {
  const crews = canModerate(u) ? [1, 2, 3, 4] : u.crewId ? [u.crewId] : [];
  const band = u.titles.includes("BAND_LEAD") || can(u, "band:oversee") || canModerate(u);
  return { crews, band };
}

export function checkTarget(u: AuthUser, audience: Audience, crewId: number | null): string | null {
  const p = postable(u);
  if (audience === "GENERAL") return null;
  if (audience === "CREW") return crewId !== null && p.crews.includes(crewId) ? null : "You can only post to your own crew";
  return p.band ? null : "Only Band leaders and DO Training can post to the Band";
}

// Which audiences a reader belongs to (used to filter lists)
export function audienceFilters(u: AuthUser) {
  const or: { audience: Audience; crewId?: number }[] = [{ audience: "GENERAL" }];
  if (u.crewId) or.push({ audience: "CREW", crewId: u.crewId });
  if (seesBand(u)) or.push({ audience: "BAND" });
  return or;
}

// Single-item access check (used by the file download route)
export function canViewScoped(
  u: AuthUser,
  s: { audience: Audience; crewId: number | null; uploadedById: string }
): boolean {
  if (canModerate(u) || s.uploadedById === u.id) return true;
  if (s.audience === "GENERAL") return true;
  if (s.audience === "CREW") return s.crewId !== null && s.crewId === u.crewId;
  return seesBand(u);
}

export const audienceText = (a: Audience, crewId: number | null) =>
  a === "GENERAL" ? "General" : a === "BAND" ? "Band" : crewName(crewId);

export function cleanHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "h3", "ul", "ol", "li", "blockquote", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      b: "strong",
      i: "em",
      div: "p",
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    },
  });
}

export const plainText = (html: string) =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").trim();

// What a file really is, judged by its first bytes and not by its name
export function sniff(b: Uint8Array): "jpeg" | "pdf" | "docx" | "doc" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "pdf";
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) return "docx";
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "doc";
  return null;
}

export const safeName = (n: string) => n.replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "file";

export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1_048_576 ? `${Math.round(n / 1024)} KB` : `${(n / 1_048_576).toFixed(1)} MB`;
