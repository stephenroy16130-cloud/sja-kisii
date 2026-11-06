const HOSTS = new Set(["docs.google.com", "drive.google.com", "forms.gle"]);

// Only https links to Google Docs, Sheets, Slides, Forms or Drive are accepted
export function parseGoogleLink(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || !HOSTS.has(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "forms.gle") return "Google Form";
    if (u.hostname === "drive.google.com") return "Google Drive";
    if (u.pathname.startsWith("/document")) return "Google Doc";
    if (u.pathname.startsWith("/spreadsheets")) return "Google Sheet";
    if (u.pathname.startsWith("/presentation")) return "Google Slides";
    if (u.pathname.startsWith("/forms")) return "Google Form";
  } catch {
    // fall through
  }
  return "Google link";
}

export const LINK_ERROR = "Paste a Google Docs, Sheets, Slides, Forms or Drive link, starting with https://";
