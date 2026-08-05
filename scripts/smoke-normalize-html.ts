/**
 * Smoke normalize HTML (npx tsx scripts/smoke-normalize-html.ts)
 */
import {
  needsHtmlNormalize,
  normalizeArticleHtml,
} from "../src/lib/content/normalize-html";
import { sanitizeArticleHtml } from "../src/lib/content/html-sanitize";

const sample = `<p>Nguyễn Tiến Sử, MD, PhD, MBA</p>
SIMTRIYO LÀ GÌ

Là thuốc dạng viên nang phóng thích kéo dài.
Dòng hai trong cùng đoạn.

Kết luận cuối.`;

if (!needsHtmlNormalize(sample)) throw new Error("should need normalize");

const out = sanitizeArticleHtml(sample);
console.log(out);

if (!out.includes("<p>SIMTRIYO LÀ GÌ</p>")) throw new Error("missing heading para");
if (!out.includes("<br />")) throw new Error("missing soft break");
if (!out.includes("<p>Kết luận cuối.</p>")) throw new Error("missing last para");

const already = `<p>Một</p><p>Hai</p>`;
const again = normalizeArticleHtml(already);
if (again !== already && again.replace(/\n/g, "") !== already) {
  // allow trivial whitespace diffs
  if (!again.includes("<p>Một</p>") || !again.includes("<p>Hai</p>")) {
    throw new Error("broke good html");
  }
}

console.log("OK normalize-html");
