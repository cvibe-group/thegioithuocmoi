/**
 * Parse a single MySQL INSERT ... VALUES (...) tuple (one row).
 * Handles escaped quotes, backslash escapes, NULL, and numbers.
 */
export function parseInsertValues(line: string): Array<string | null> | null {
  const marker = "VALUES (";
  const idx = line.indexOf(marker);
  if (idx < 0) return null;

  let i = idx + marker.length;
  const fields: Array<string | null> = [];
  const s = line;

  while (i < s.length) {
    while (i < s.length && (s[i] === " " || s[i] === "\t")) i++;
    if (s[i] === ")") break;

    if (s.startsWith("NULL", i) && (s[i + 4] === "," || s[i + 4] === ")")) {
      fields.push(null);
      i += 4;
    } else if (s[i] === "'") {
      i++;
      let out = "";
      while (i < s.length) {
        const ch = s[i];
        if (ch === "\\") {
          const n = s[i + 1];
          const map: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "0": "\0",
            Z: "\x1a",
            "'": "'",
            '"': '"',
            "\\": "\\",
          };
          out += map[n] !== undefined ? map[n] : (n ?? "");
          i += 2;
        } else if (ch === "'" && s[i + 1] === "'") {
          out += "'";
          i += 2;
        } else if (ch === "'") {
          i++;
          break;
        } else {
          out += ch;
          i++;
        }
      }
      fields.push(out);
    } else {
      const start = i;
      while (i < s.length && s[i] !== "," && s[i] !== ")") i++;
      fields.push(s.slice(start, i));
    }

    if (s[i] === ",") i++;
  }

  return fields;
}

export function decodeWpSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function buildPermalinkPath(postDate: string, postName: string): string {
  const m = postDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const slug = decodeWpSlug(postName);
  if (!m || !slug) return "";
  return `/${m[1]}/${m[2]}/${m[3]}/${slug}`;
}
