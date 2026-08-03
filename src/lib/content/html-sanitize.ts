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
  "a",
  "img",
  "blockquote",
  "figure",
  "figcaption",
]);

const VOID_TAGS = new Set(["br", "img"]);

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

    if (tag === "img") {
      const attrs = parseAttrs(m[2] ?? "");
      if (!attrs.src || !isSafeUrl(attrs.src)) continue;
      out.push(
        `<img src="${escapeAttr(attrs.src)}" alt="${escapeAttr(attrs.alt ?? "")}" />`,
      );
      continue;
    }

    if (tag === "a") {
      const attrs = parseAttrs(m[2] ?? "");
      if (!attrs.href || !isSafeUrl(attrs.href)) continue;
      const parts = [`href="${escapeAttr(attrs.href)}"`];
      if (attrs.title) parts.push(`title="${escapeAttr(attrs.title)}"`);
      if (attrs.target === "_blank") {
        parts.push('target="_blank"', 'rel="noopener noreferrer"');
      }
      out.push(`<a ${parts.join(" ")}>`);
      if (!selfClosing) stack.push("a");
      continue;
    }

    out.push(`<${tag}>`);
    if (!selfClosing) stack.push(tag);
  }

  while (stack.length) {
    out.push(`</${stack.pop()}>`);
  }

  return out.join("").trim();
}
