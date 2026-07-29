/**
 * Normalize articles.path / articles.slug to Unicode NFC and cascade FKs.
 *
 * Usage:
 *   npx tsx scripts/normalize-article-paths-nfc.ts
 *   npx tsx scripts/normalize-article-paths-nfc.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env.local") });

const apply = process.argv.includes("--apply");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase URL/key in .env.local");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase
    .from("articles")
    .select("path, slug, year, month, day");
  if (error) throw new Error(error.message);

  const updates = (rows ?? [])
    .map((row) => {
      const oldPath = row.path as string;
      const oldSlug = row.slug as string;
      const newSlug = oldSlug.normalize("NFC");
      const newPath = `/${row.year}/${row.month}/${row.day}/${newSlug}`.normalize(
        "NFC",
      );
      if (oldPath === newPath && oldSlug === newSlug) return null;
      return { oldPath, newPath, oldSlug, newSlug };
    })
    .filter(Boolean) as Array<{
    oldPath: string;
    newPath: string;
    oldSlug: string;
    newSlug: string;
  }>;

  console.log(`Articles needing NFC normalize: ${updates.length}`);
  if (!updates.length) return;
  console.log("Sample:", updates.slice(0, 3));

  if (!apply) {
    console.log("Dry-run only. Re-run with --apply to write.");
    return;
  }

  let ok = 0;
  for (const item of updates) {
    // 1) Insert NFC twin (copy) — avoided; update PK-like path via temp:
    // Update child FKs to new path only works if parent already has new path.
    // Strategy: update article path using a two-step with deferred constraints is hard in JS client.
    // Instead: update articles by matching old path — if FK blocks, update children first to old
    // then... Postgres without ON UPDATE CASCADE requires:
    //   a) add NFC row, retarget FKs, delete old row — heavy
    // Simpler: try direct update; if fails, do children→temp→parent→children

    const { error: artErr } = await supabase
      .from("articles")
      .update({ path: item.newPath, slug: item.newSlug })
      .eq("path", item.oldPath);

    if (!artErr) {
      ok += 1;
      continue;
    }

    // FK block: retarget children to newPath after creating NFC row copy is complex.
    // Fall back: update category_articles / homepage via delete+reinsert pattern.
    console.warn(`direct update failed for ${item.oldPath}: ${artErr.message}`);

    const { data: full, error: fetchErr } = await supabase
      .from("articles")
      .select("*")
      .eq("path", item.oldPath)
      .maybeSingle();
    if (fetchErr || !full) {
      console.error("  fetch failed", fetchErr?.message);
      continue;
    }

    const { error: insertErr } = await supabase.from("articles").insert({
      ...full,
      path: item.newPath,
      slug: item.newSlug,
    });
    if (insertErr) {
      console.error("  insert NFC failed", insertErr.message);
      continue;
    }

    await supabase
      .from("category_articles")
      .update({ article_path: item.newPath })
      .eq("article_path", item.oldPath);
    await supabase
      .from("homepage_section_articles")
      .update({ article_path: item.newPath })
      .eq("article_path", item.oldPath);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["featured_article_path", "secondary_news_paths"]);
    for (const setting of settings ?? []) {
      if (
        setting.key === "featured_article_path" &&
        setting.value === item.oldPath
      ) {
        await supabase
          .from("site_settings")
          .update({ value: item.newPath })
          .eq("key", "featured_article_path");
      }
      if (setting.key === "secondary_news_paths" && Array.isArray(setting.value)) {
        const next = (setting.value as string[]).map((p) =>
          p === item.oldPath ? item.newPath : p,
        );
        await supabase
          .from("site_settings")
          .update({ value: next })
          .eq("key", "secondary_news_paths");
      }
    }

    const { error: delErr } = await supabase
      .from("articles")
      .delete()
      .eq("path", item.oldPath);
    if (delErr) {
      console.error("  delete old failed", delErr.message);
      continue;
    }
    ok += 1;
  }

  console.log(`Updated ${ok}/${updates.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
