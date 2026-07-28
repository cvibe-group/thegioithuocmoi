/**
 * Quick smoke test for htmlToBlocks — run: npx tsx scripts/migrate-wp/smoke-html-to-blocks.ts
 */
import { htmlToBlocks } from "./html-to-blocks";

const samples = [
  `<!-- wp:heading --><h2>YERVOY LÀ GÌ</h2><!-- /wp:heading --><!-- wp:paragraph --><p>Là thuốc dạng dịch tiêm.</p><!-- /wp:paragraph --><!-- wp:list --><ul><li>Chỉ định A</li><li>Chỉ định B</li></ul><!-- /wp:list -->`,
  `1. Bối cảnh\n\nĐoạn văn bản thường.\n\n2. Kết luận\n\nKết thúc.`,
];

for (const [i, html] of samples.entries()) {
  console.log(`\n=== sample ${i + 1} ===`);
  console.log(JSON.stringify(htmlToBlocks(html), null, 2));
}
