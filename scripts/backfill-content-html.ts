/**
 * Backfill articles.content_html from blocks JSON.
 *
 * Usage:
 *   npx tsx scripts/backfill-content-html.ts --dry-run
 *   npx tsx scripts/backfill-content-html.ts --limit=50
 *   npx tsx scripts/backfill-content-html.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config(); // fallback .env

import { createClient } from "@supabase/supabase-js";
import type { ArticleBlock } from "../src/types/content";
import { blocksToHtml } from "../src/lib/content/blocks-to-html";
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
      "Warning: SUPABASE_SERVICE_ROLE_KEY missing — updates may fail RLS. Prefer service role for backfill.",
    );
  }

  const supabase = createClient(url, key);
  let query = supabase
    .from("articles")
    .select("path, blocks, content_html")
    .or("content_html.is.null,content_html.eq.");

  if (limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  console.log(`Found ${rows.length} articles needing content_html`);

  let updated = 0;
  for (const row of rows) {
    const html = sanitizeArticleHtml(
      blocksToHtml((row.blocks ?? []) as ArticleBlock[]),
    );
    if (!html) {
      console.log(`  skip empty ${row.path}`);
      continue;
    }
    if (dryRun) {
      console.log(`  dry-run ${row.path} (${html.length} chars)`);
      updated += 1;
      continue;
    }
    const { error: updErr } = await supabase
      .from("articles")
      .update({ content_html: html })
      .eq("path", row.path);
    if (updErr) {
      console.warn(`  fail ${row.path}: ${updErr.message}`);
      continue;
    }
    updated += 1;
    console.log(`  ok ${row.path}`);
  }

  console.log(`Done. ${dryRun ? "Would update" : "Updated"} ${updated} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
