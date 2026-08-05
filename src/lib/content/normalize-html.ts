/**
 * Normalize article HTML so plain-text newlines become <p> / <br />,
 * without breaking existing block markup.
 */

const BLOCK_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
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
  "div",
]);

const VOID_TAGS = new Set(["br", "img", "col", "hr"]);

function wrapLooseText(text: string): string {
  const trimmed = text.replace(/^\n+|\n+$/g, "");
  if (!trimmed.trim()) return "";

  // Single run without newlines → still wrap so CSS space-y applies.
  if (!trimmed.includes("\n")) {
    return `<p>${trimmed.trim()}</p>`;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function softBreaksInsideBlock(text: string): string {
  // Keep intentional line breaks inside an existing block without nesting <p>.
  if (!text.includes("\n")) return text;
  return text.replace(/\n+/g, "<br />");
}

/**
 * Convert orphan plain-text runs (common after WP/plain migrate) into paragraphs.
 * Existing block tags are preserved; newlines inside blocks become <br />.
 */
export function normalizeArticleHtml(input: string): string {
  if (!input?.trim()) return "";

  const html = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: string[] = [];
  const stack: string[] = [];
  const tokenRe = /<\/?([a-zA-Z0-9]+)(\s[^>]*)?\s*\/?>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(html))) {
    if (match[3] != null) {
      const text = match[3];
      const inBlock = stack.some((tag) => BLOCK_TAGS.has(tag));
      out.push(inBlock ? softBreaksInsideBlock(text) : wrapLooseText(text));
      continue;
    }

    const raw = match[0];
    const tag = match[1].toLowerCase();
    const isClose = raw.startsWith("</");
    const selfClosing = /\/\s*>$/.test(raw) || VOID_TAGS.has(tag);

    if (isClose) {
      const idx = stack.lastIndexOf(tag);
      if (idx >= 0) stack.splice(idx);
      out.push(raw);
      continue;
    }

    out.push(raw);
    if (!selfClosing && BLOCK_TAGS.has(tag)) {
      stack.push(tag);
    }
  }

  return out.join("").replace(/\n{3,}/g, "\n").trim();
}

/** True when HTML looks like it needs paragraph reflow (loose newlines / few blocks). */
export function needsHtmlNormalize(input: string): boolean {
  if (!input?.trim()) return false;
  const html = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Plain text with no block tags at all
  if (!/<(p|h[1-6]|ul|ol|blockquote|table|figure)\b/i.test(html)) {
    return true;
  }
  if (!html.includes("\n")) return false;
  if (!/<p[\s>]/i.test(html) && html.includes("\n")) return true;
  if (/<\/[a-z]+>\s*\n+[^\s<]/i.test(html)) return true;
  if (/<p\b[^>]*>[^<]*\n[^<]*<\/p>/i.test(html)) return true;
  return false;
}
