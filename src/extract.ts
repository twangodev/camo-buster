const CAMO_RE = /https:\/\/camo\.githubusercontent\.com\/[A-Za-z0-9_\-/=%.?&;:+]+/g;

export function extractCamoUrls(html: string): string[] {
  const out = new Set<string>();
  for (const raw of html.match(CAMO_RE) ?? []) {
    out.add(raw.replace(/&amp;/g, '&').replace(/["'<>]+$/, ''));
  }
  return [...out];
}
