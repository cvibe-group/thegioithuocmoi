/** Unicode path helpers — Vietnamese URLs may be NFD in DB but NFC in the browser. */

export function normalizeUnicode(value: string): string {
  return value.normalize("NFC");
}

/** Decode a route param that Next may leave percent-encoded. */
export function decodeRouteParam(value: string): string {
  let current = value;
  // Next sometimes passes `%CC%A3` literally in the slug segment.
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

/** Build article path and unique lookup variants (NFC / NFD / raw). */
export function articlePathVariants(
  year: string,
  month: string,
  day: string,
  slug: string,
): string[] {
  const y = decodeRouteParam(year);
  const m = decodeRouteParam(month);
  const d = decodeRouteParam(day);
  const s = decodeRouteParam(slug);
  const raw = `/${y}/${m}/${d}/${s}`;
  return uniquePaths([raw, normalizeUnicode(raw), raw.normalize("NFD")]);
}

export function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

export function normalizeArticleHref(path: string): string {
  if (!path) return path;
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return normalizeUnicode(withSlash);
}
