/**
 * Reformat article content_html: plain-text newlines → <p>/<br>.
 *
 * Usage:
 *   npx tsx scripts/reformat-article-html.ts --dry-run --limit=20
 *   npx tsx scripts/reformat-article-html.ts --limit=100
 *   npx tsx scripts/reformat-article-html.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config();

import { createClient } from "@supabase/supabase-js";
import { htmlToBlocks } from "../src/lib/content/html-to-blocks";
import {
  needsHtmlNormalize,
  normalizeArticleHtml,
} from "../src/lib/content/normalize-html";
import { sanitizeArticleHtml } from "../src/lib/content/html-sanitize";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const dryRun = process.argv.includes("--dry-run");
const limit = Number(argValue("limit") ?? "0") || 0;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL and service/anon key");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "Warning: SUPABASE_SERVICE_ROLE_KEY missing — updates may fail RLS.",
    );
  }

  const supabase = createClient(url, key);
  const pageSize = 200;
  let from = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  for (;;) {
    let query = supabase
      .from("articles")
      .select("path, content_html")
      .not("content_html", "is", null)
      .order("path")
      .range(from, from + pageSize - 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) break;

    for (const row of rows) {
      if (limit > 0 && updated + skipped >= limit && dryRun) {
        // in dry-run with limit, stop after examining `limit` candidates needing fix
      }
      scanned += 1;
      const raw = row.content_html as string;
      if (!needsHtmlNormalize(raw)) {
        skipped += 1;
        continue;
      }
      if (limit > 0 && updated >= limit) {
        console.log(`Reached --limit=${limit}`);
        console.log(
          JSON.stringify({ scanned, updated, skipped, dryRun }, null, 2),
        );
        return;
      }

      const next = sanitizeArticleHtml(normalizeArticleHtml(raw));
      if (!next || next === raw) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(
          `dry-run ${row.path}: ${raw.length} → ${next.length} chars; p-count ${
            (next.match(/<p[\s>]/gi) || []).length
          }`,
        );
        updated += 1;
        continue;
      }

      const blocks = htmlToBlocks(next, { includeImages: true });
      const { error: updErr } = await supabase
        .from("articles")
        .update({
          content_html: next,
          blocks,
          updated_at: new Date().toISOString(),
        })
        .eq("path", row.path);

      if (updErr) {
        console.warn(`fail ${row.path}: ${updErr.message}`);
        continue;
      }
      updated += 1;
      if (updated % 50 === 0) {
        console.log(`… updated ${updated}`);
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  console.log(JSON.stringify({ scanned, updated, skipped, dryRun }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
