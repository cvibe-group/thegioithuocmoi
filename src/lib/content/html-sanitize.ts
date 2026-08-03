/**
 * Allowlist sanitizer for article body HTML (CKEditor output).
 * Works in browser and Node without DOMPurify/jsdom.
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "span",
  "a",
  "img",
  "blockquote",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
]);

const VOID_TAGS = new Set(["br", "img", "col"]);

const STYLE_ALLOWED_ON = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "a",
  "li",
  "td",
  "th",
  "table",
  "figure",
  "div",
]);

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = value;
  }
  return attrs;
}

/** Safe color values only (hex / rgb(a) / hsl(a)) — no url()/expression. */
function sanitizeColorValue(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
    return v;
  }
  if (
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(
      v,
    )
  ) {
    return v.replace(/\s+/g, "");
  }
  if (
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(
      v,
    )
  ) {
    return v.replace(/\s+/g, "");
  }
  return null;
}

/** Keep only safe CSS declarations (color / text-align / simple width). */
function sanitizeStyle(style: string): string | null {
  const parts: string[] = [];
  const color = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (color?.[1]) {
    const safeColor = sanitizeColorValue(color[1]);
    if (safeColor) parts.push(`color:${safeColor}`);
  }
  const align = style.match(/text-align\s*:\s*(left|center|right|justify)\s*;?/i);
  if (align?.[1]) parts.push(`text-align:${align[1].toLowerCase()}`);
  const width = style.match(/width\s*:\s*(\d{1,4}(?:\.\d+)?(?:%|px))\s*;?/i);
  if (width?.[1]) parts.push(`width:${width[1]}`);
  return parts.length ? parts.join(";") : null;
}

function sanitizeClass(className: string): string | null {
  const allowed = className
    .split(/\s+/)
    .filter((token) =>
      /^(table|image|text-align-(?:left|center|right|justify))$/i.test(token),
    );
  return allowed.length ? allowed.join(" ") : null;
}

function openTag(tag: string, attrsRaw: string): string | null {
  const attrs = parseAttrs(attrsRaw);
  const parts: string[] = [];

  if (tag === "a") {
    if (!attrs.href || !isSafeUrl(attrs.href)) return null;
    parts.push(`href="${escapeAttr(attrs.href)}"`);
    if (attrs.title) parts.push(`title="${escapeAttr(attrs.title)}"`);
    if (attrs.target === "_blank") {
      parts.push('target="_blank"', 'rel="noopener noreferrer"');
    }
  } else if (tag === "img") {
    if (!attrs.src || !isSafeUrl(attrs.src)) return null;
    parts.push(`src="${escapeAttr(attrs.src)}"`);
    parts.push(`alt="${escapeAttr(attrs.alt ?? "")}"`);
  } else {
    if ((tag === "td" || tag === "th") && attrs.colspan) {
      const n = Number(attrs.colspan);
      if (Number.isInteger(n) && n > 0 && n < 50) {
        parts.push(`colspan="${n}"`);
      }
    }
    if ((tag === "td" || tag === "th") && attrs.rowspan) {
      const n = Number(attrs.rowspan);
      if (Number.isInteger(n) && n > 0 && n < 50) {
        parts.push(`rowspan="${n}"`);
      }
    }
    if (attrs.class) {
      const safeClass = sanitizeClass(attrs.class);
      if (safeClass) parts.push(`class="${escapeAttr(safeClass)}"`);
    }
    if (attrs.style && STYLE_ALLOWED_ON.has(tag)) {
      const safeStyle = sanitizeStyle(attrs.style);
      if (safeStyle) parts.push(`style="${escapeAttr(safeStyle)}"`);
    }
  }

  return parts.length ? `<${tag} ${parts.join(" ")}>` : `<${tag}>`;
}

/**
 * Strip disallowed tags/attrs. Text kept; scripts/styles removed with content.
 */
export function sanitizeArticleHtml(input: string): string {
  if (!input?.trim()) return "";

  const html = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  const out: string[] = [];
  const stack: string[] = [];
  const re = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?\/?>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    if (m[3] != null) {
      out.push(
        m[3]
          .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/gi, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;"),
      );
      continue;
    }

    const tag = m[1].toLowerCase();
    const raw = m[0];
    const selfClosing = /\/\s*>$/.test(raw) || VOID_TAGS.has(tag);
    const isClose = raw.startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (isClose) {
      if (!stack.includes(tag)) continue;
      while (stack.length) {
        const top = stack.pop()!;
        out.push(`</${top}>`);
        if (top === tag) break;
      }
      continue;
    }

    if (tag === "br") {
      out.push("<br />");
      continue;
    }

    if (tag === "col") {
      const open = openTag(tag, m[2] ?? "");
      if (open) out.push(open.endsWith(">") ? open.replace(/>$/, " />") : `${open} />`);
      continue;
    }

    if (tag === "img") {
      const open = openTag(tag, m[2] ?? "");
      if (open) {
        out.push(open.replace(/>$/, " />"));
      }
      continue;
    }

    const open = openTag(tag, m[2] ?? "");
    if (!open) continue;
    out.push(open);
    if (!selfClosing) stack.push(tag);
  }

  while (stack.length) {
    out.push(`</${stack.pop()}>`);
  }

  return out.join("").trim();
}
