import type { ArticleBlock } from "../../src/types/content";

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  "#8217": "’",
  "#8216": "‘",
  "#8220": "“",
  "#8221": "”",
  "#8211": "–",
  "#8212": "—",
  "#8230": "…",
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&([a-zA-Z]+|#\d+);/g, (full, name: string) => {
      return ENTITY_MAP[name] ?? ENTITY_MAP[name.toLowerCase()] ?? full;
    });
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function normalizeText(text: string): string {
  return decodeEntities(text)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pushParagraph(blocks: ArticleBlock[], text: string) {
  const t = normalizeText(text);
  if (!t) return;
  blocks.push({ type: "paragraph", text: t });
}

function pushHeading(blocks: ArticleBlock[], text: string) {
  const t = normalizeText(text);
  if (!t) return;
  blocks.push({ type: "heading", text: t });
}

function parseListItems(listHtml: string): string[] {
  const items: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(listHtml))) {
    const text = stripTags(m[1]).replace(/\n+/g, " ").trim();
    if (text) items.push(text);
  }
  return items;
}

/**
 * Convert WordPress post_content HTML into ArticleBlock[].
 * Supports Gutenberg comments, classic HTML, and lightly structured plain text.
 * Images are skipped (featured image is handled separately).
 */
export function htmlToBlocks(html: string): ArticleBlock[] {
  if (!html?.trim()) return [];

  let raw = html
    .replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<img\b[^>]*>/gi, "");

  const blocks: ArticleBlock[] = [];
  const blockRe =
    /<(h[1-6]|p|ul|ol|blockquote|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let matchedTagged = false;

  while ((match = blockRe.exec(raw))) {
    matchedTagged = true;
    const before = raw.slice(lastIndex, match.index);
    if (stripTags(before)) {
      for (const chunk of stripTags(before).split(/\n{2,}/)) {
        pushParagraph(blocks, chunk);
      }
    }

    const tag = match[1].toLowerCase();
    const inner = match[3];

    if (tag === "ul" || tag === "ol") {
      const items = parseListItems(match[0]);
      if (items.length) blocks.push({ type: "list", items });
    } else if (/^h[1-6]$/.test(tag)) {
      pushHeading(blocks, stripTags(inner));
    } else if (tag === "blockquote") {
      pushParagraph(blocks, stripTags(inner));
    } else {
      // p / div — if nested list, prefer list
      if (/<ul\b|<ol\b/i.test(inner)) {
        const items = parseListItems(inner);
        const textOnly = stripTags(inner.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/gi, ""));
        if (textOnly) pushParagraph(blocks, textOnly);
        if (items.length) blocks.push({ type: "list", items });
      } else {
        const text = stripTags(inner);
        // Gutenberg often uses <p><strong>HEADING</strong></p> for section titles
        const strongOnly = /^\s*<(strong|b)(\s[^>]*)?>[\s\S]*<\/\1>\s*$/i.test(
          inner.trim(),
        );
        if (
          strongOnly &&
          text.length > 0 &&
          text.length <= 80 &&
          !/[.!?…]$/.test(text)
        ) {
          pushHeading(blocks, text);
        } else {
          pushParagraph(blocks, text);
        }
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const rest = raw.slice(lastIndex);
  if (matchedTagged) {
    if (stripTags(rest)) {
      for (const chunk of stripTags(rest).split(/\n{2,}/)) {
        pushParagraph(blocks, chunk);
      }
    }
  } else {
    // Plain / lightly tagged classic content
    const text = stripTags(raw);
    for (const chunk of text.split(/\n{2,}/)) {
      const line = chunk.trim();
      if (!line) continue;
      // Heuristic: short ALL-CAPS or "N. Title" as heading
      const singleLine = line.replace(/\n/g, " ").trim();
      if (
        singleLine.length <= 80 &&
        (/^\d+[\.\)]\s+\S/.test(singleLine) ||
          (/^[A-ZÀ-Ỵ0-9][A-ZÀ-Ỵ0-9\s\-–—:,]{4,}$/.test(singleLine) &&
            singleLine === singleLine.toUpperCase()))
      ) {
        pushHeading(blocks, singleLine.replace(/^\d+[\.\)]\s+/, ""));
      } else if (line.includes("\n") && line.split("\n").every((l) => /^[-•*]\s+/.test(l.trim()) || !l.trim())) {
        const items = line
          .split("\n")
          .map((l) => l.replace(/^[-•*]\s+/, "").trim())
          .filter(Boolean);
        if (items.length) blocks.push({ type: "list", items });
      } else {
        pushParagraph(blocks, singleLine);
      }
    }
  }

  // Merge consecutive empty-avoid; drop tiny noise
  return blocks.filter((b) => {
    if (b.type === "list") return (b.items?.length ?? 0) > 0;
    return Boolean(b.text?.trim());
  });
}

export function estimateReadTime(blocks: ArticleBlock[]): string {
  let chars = 0;
  for (const b of blocks) {
    if (b.type === "list") chars += (b.items ?? []).join(" ").length;
    else chars += b.text?.length ?? 0;
  }
  const minutes = Math.max(1, Math.round(chars / 900));
  return `${minutes} phút đọc`;
}
