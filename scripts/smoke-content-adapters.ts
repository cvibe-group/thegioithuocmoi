/**
 * Quick smoke for content adapters (run: npx tsx scripts/smoke-content-adapters.ts)
 */
import { blocksToHtml } from "../src/lib/content/blocks-to-html";
import { htmlToBlocks } from "../src/lib/content/html-to-blocks";
import { sanitizeArticleHtml } from "../src/lib/content/html-sanitize";
import type { ArticleBlock } from "../src/types/content";

const blocks: ArticleBlock[] = [
  { type: "heading", text: "Giới thiệu" },
  { type: "paragraph", text: "Đoạn văn huyết áp." },
  { type: "list", items: ["Một", "Hai"] },
  {
    type: "image",
    src: "https://example.com/a.jpg",
    alt: "Ảnh minh họa",
  },
];

const html = blocksToHtml(blocks);
const round = htmlToBlocks(html);
const dirty = sanitizeArticleHtml(
  `<p>Hi</p><script>alert(1)</script><img src=x onerror=alert(1) /><a href="javascript:alert(1)">x</a><a href="https://ok.com">ok</a>`,
);

console.log("html:", html);
console.log("round-trip types:", round.map((b) => b.type).join(","));
console.log("sanitize:", dirty);

if (!html.includes("<h2>")) throw new Error("missing h2");
if (round.length < 3) throw new Error("round-trip too short");
if (dirty.includes("script") || dirty.includes("javascript:")) {
  throw new Error("sanitize failed");
}
if (!dirty.includes('href="https://ok.com"')) throw new Error("lost safe link");

console.log("OK");
