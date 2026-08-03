/**
 * WP migrate wrapper: strip images (featured image handled separately).
 */
export {
  decodeEntities,
  stripTags,
  estimateReadTime,
} from "../../src/lib/content/html-to-blocks";

import { htmlToBlocks as sharedHtmlToBlocks } from "../../src/lib/content/html-to-blocks";
import type { ArticleBlock } from "../../src/types/content";

export function htmlToBlocks(html: string): ArticleBlock[] {
  return sharedHtmlToBlocks(html, { includeImages: false });
}
