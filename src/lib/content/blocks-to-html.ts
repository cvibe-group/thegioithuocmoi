import type { ArticleBlock } from "@/types/content";

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Serialize ArticleBlock[] into HTML suitable for CKEditor initial data. */
export function blocksToHtml(blocks: ArticleBlock[] | null | undefined): string {
  if (!blocks?.length) return "";

  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "heading" && block.text?.trim()) {
      parts.push(`<h2>${escapeText(block.text.trim())}</h2>`);
      continue;
    }
    if (block.type === "paragraph" && block.text?.trim()) {
      parts.push(`<p>${escapeText(block.text.trim())}</p>`);
      continue;
    }
    if (block.type === "list" && block.items?.length) {
      const items = block.items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => `<li>${escapeText(item)}</li>`)
        .join("");
      if (items) parts.push(`<ul>${items}</ul>`);
      continue;
    }
    if (block.type === "image" && block.src?.trim()) {
      const src = escapeText(block.src.trim());
      const alt = escapeText(block.alt?.trim() ?? "");
      if (alt) {
        parts.push(
          `<figure><img src="${src}" alt="${alt}" /><figcaption>${alt}</figcaption></figure>`,
        );
      } else {
        parts.push(`<figure><img src="${src}" alt="" /></figure>`);
      }
    }
  }
  return parts.join("");
}
