/**
 * Phase 2: Transform WP extract → Supabase-shaped rows + dry-run report.
 *
 * Usage:
 *   npx tsx scripts/migrate-wp/dry-run-upsert.ts
 *   npx tsx scripts/migrate-wp/dry-run-upsert.ts --apply   # writes to Supabase
 *
 * Default is dry-run (no DB writes). --apply clears content tables then upserts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { transformPhase2, writePhase2Artifacts } from "./transform";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

config({ path: path.join(ROOT, ".env.local") });

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function clearContent(supabase: SupabaseClient) {
  const tables = [
    "category_articles",
    "homepage_section_articles",
    "glossary_entries",
    "articles",
    "categories",
    "glossary_tabs",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().gte("sort_order", -999999);
    if (error) {
      // fallback for tables without sort_order / text PK
      if (table === "glossary_tabs") {
        await supabase.from("glossary_tabs").delete().neq("id", "");
      } else if (table === "articles") {
        await supabase.from("articles").delete().neq("path", "");
      } else if (table === "categories") {
        await supabase.from("categories").delete().neq("slug", "");
      } else {
        console.warn(`clear ${table}:`, error.message);
      }
    }
  }
}

async function applyToSupabase(
  result: ReturnType<typeof transformPhase2>,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and anon/service key in .env.local",
    );
  }

  const supabase = createClient(url, key);
  console.log("Clearing existing content tables...");
  await clearContent(supabase);

  const articles = result.articles.map(
    ({ _wpId, _wpType, _sourcePriority, ...row }) => row,
  );
  const glossaryEntries = result.glossaryEntries.map(({ _wpId, ...row }) => row);

  console.log(`Upserting ${result.categories.length} categories...`);
  {
    const { error } = await supabase.from("categories").upsert(result.categories, {
      onConflict: "slug",
    });
    if (error) throw new Error(`categories: ${error.message}`);
  }

  console.log(`Upserting ${result.glossaryTabs.length} glossary_tabs...`);
  {
    const { error } = await supabase
      .from("glossary_tabs")
      .upsert(result.glossaryTabs, { onConflict: "id" });
    if (error) throw new Error(`glossary_tabs: ${error.message}`);
  }

  console.log(`Inserting ${articles.length} articles in batches...`);
  for (let i = 0; i < articles.length; i += 25) {
    const batch = articles.slice(i, i + 25);
    const { error } = await supabase.from("articles").upsert(batch, {
      onConflict: "path",
    });
    if (error) throw new Error(`articles batch ${i}: ${error.message}`);
    if (i % 200 === 0) console.log(`  ... ${i}/${articles.length}`);
  }

  console.log(`Inserting ${result.categoryArticles.length} category_articles...`);
  for (let i = 0; i < result.categoryArticles.length; i += 100) {
    const batch = result.categoryArticles.slice(i, i + 100);
    const { error } = await supabase.from("category_articles").upsert(batch);
    if (error) throw new Error(`category_articles batch ${i}: ${error.message}`);
  }

  console.log(`Inserting ${glossaryEntries.length} glossary_entries...`);
  // glossary_entries has no natural unique key besides id uuid — delete+insert already cleared
  for (let i = 0; i < glossaryEntries.length; i += 100) {
    const batch = glossaryEntries.slice(i, i + 100);
    const { error } = await supabase.from("glossary_entries").insert(batch);
    if (error) throw new Error(`glossary_entries batch ${i}: ${error.message}`);
  }

  console.log("Apply complete.");
}

async function main() {
  const apply = hasFlag("--apply");
  const extractDir = path.join(__dirname, "out");

  if (!fs.existsSync(path.join(extractDir, "posts.jsonl"))) {
    throw new Error(
      "Missing phase 1 output. Run: npm run migrate:wp:extract",
    );
  }

  console.log("Transforming phase 1 extract → Supabase rows...");
  const result = transformPhase2(extractDir);
  const outDir = writePhase2Artifacts(result);
  console.log(`Wrote artifacts → ${path.relative(ROOT, outDir)}`);
  console.log(JSON.stringify(result.report.counts, null, 2));
  console.log("Block stats:", result.report.blockStats);

  if (!apply) {
    console.log("\nDry-run only (no Supabase writes).");
    console.log("Review scripts/migrate-wp/out/phase2/report.json");
    console.log("Apply later with: npm run migrate:wp:phase2 -- --apply");
    return;
  }

  console.log("\n--apply enabled: writing to Supabase...");
  await applyToSupabase(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
