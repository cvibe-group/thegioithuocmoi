/**
 * Convert existing Supabase Storage raster images → WebP, rewrite DB URLs, delete originals.
 *
 * Usage:
 *   npx tsx scripts/optimize-storage-webp.ts
 *   npx tsx scripts/optimize-storage-webp.ts --dry-run
 *   npx tsx scripts/optimize-storage-webp.ts --limit=20
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";

config({ path: ".env.local" });

const BUCKET = "images";
const QUALITY = 82;
const MAX_EDGE = 1920;

const CONVERT_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const SKIP_NAMES = new Set([".emptyFolderPlaceholder"]);

const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function publicUrl(objectPath: string) {
  return `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

function toWebpPath(objectPath: string) {
  return objectPath.replace(/\.[^.]+$/, ".webp");
}

function extOf(objectPath: string) {
  const i = objectPath.lastIndexOf(".");
  return i >= 0 ? objectPath.slice(i).toLowerCase() : "";
}

async function listAllObjects(prefix = ""): Promise<string[]> {
  const out: string[] = [];
  const pageSize = 100;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    if (!data?.length) break;

    for (const item of data) {
      const name = item.name;
      if (!name || SKIP_NAMES.has(name)) continue;
      const full = prefix ? `${prefix}/${name}` : name;
      // Folder heuristic: no metadata.id / or name without extension and has children
      const isFile = Boolean(item.id) || Boolean(item.metadata);
      if (isFile && extOf(name)) {
        out.push(full);
      } else if (!item.id && !item.metadata) {
        // Likely folder — recurse
        const nested = await listAllObjects(full);
        out.push(...nested);
      } else if (isFile) {
        out.push(full);
      } else {
        const nested = await listAllObjects(full);
        out.push(...nested);
      }
    }

    if (data.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

async function convertBuffer(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toBuffer({ resolveWithObject: true });
}

function rewriteText(value: string, map: Map<string, string>) {
  let next = value;
  for (const [from, to] of map) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}

async function rewriteDatabase(urlMap: Map<string, string>) {
  if (urlMap.size === 0) return;

  console.log(`\nRewriting DB references (${urlMap.size} URL pairs)...`);

  // articles.image / author_image / content_html / blocks
  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, image, author_image, content_html, blocks");
  if (articlesError) throw new Error(articlesError.message);

  let articleUpdates = 0;
  for (const row of articles ?? []) {
    const patch: Record<string, unknown> = {};
    if (row.image && urlMap.has(row.image)) {
      patch.image = urlMap.get(row.image);
    }
    if (row.author_image && urlMap.has(row.author_image)) {
      patch.author_image = urlMap.get(row.author_image);
    }
    if (typeof row.content_html === "string" && row.content_html) {
      const next = rewriteText(row.content_html, urlMap);
      if (next !== row.content_html) patch.content_html = next;
    }
    if (row.blocks != null) {
      const raw = JSON.stringify(row.blocks);
      const next = rewriteText(raw, urlMap);
      if (next !== raw) patch.blocks = JSON.parse(next);
    }
    if (Object.keys(patch).length === 0) continue;
    if (dryRun) {
      articleUpdates += 1;
      continue;
    }
    const { error } = await supabase.from("articles").update(patch).eq("id", row.id);
    if (error) throw new Error(`article ${row.id}: ${error.message}`);
    articleUpdates += 1;
  }
  console.log(`  articles updated: ${articleUpdates}`);

  const { data: authors, error: authorsError } = await supabase
    .from("authors")
    .select("id, image");
  if (authorsError) throw new Error(authorsError.message);

  let authorUpdates = 0;
  for (const row of authors ?? []) {
    if (!row.image || !urlMap.has(row.image)) continue;
    if (!dryRun) {
      const { error } = await supabase
        .from("authors")
        .update({ image: urlMap.get(row.image), updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw new Error(`author ${row.id}: ${error.message}`);
    }
    authorUpdates += 1;
  }
  console.log(`  authors updated: ${authorUpdates}`);

  const { data: settings, error: settingsError } = await supabase
    .from("site_settings")
    .select("key, value");
  if (settingsError) throw new Error(settingsError.message);

  let settingsUpdates = 0;
  for (const row of settings ?? []) {
    const raw =
      typeof row.value === "string" ? row.value : JSON.stringify(row.value);
    if (!raw) continue;
    const next = rewriteText(raw, urlMap);
    if (next === raw) continue;
    if (!dryRun) {
      let value: unknown = next;
      if (typeof row.value !== "string") {
        try {
          value = JSON.parse(next);
        } catch {
          value = next;
        }
      } else {
        // site_settings often stores JSON-encoded strings with quotes
        try {
          const parsed = JSON.parse(String(row.value));
          if (typeof parsed === "string") {
            value = rewriteText(parsed, urlMap);
          } else {
            value = JSON.parse(next);
          }
        } catch {
          value = next;
        }
      }
      const { error } = await supabase
        .from("site_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", row.key);
      if (error) throw new Error(`setting ${row.key}: ${error.message}`);
    }
    settingsUpdates += 1;
  }
  console.log(`  site_settings updated: ${settingsUpdates}`);
}

async function main() {
  console.log(dryRun ? "DRY RUN — no writes" : "LIVE — converting storage to WebP");
  console.log(`Listing objects in bucket "${BUCKET}"...`);

  const all = await listAllObjects();
  const candidates = all.filter((path) => {
    const ext = extOf(path);
    if (!CONVERT_EXT.has(ext)) return false;
    // Skip already-optimized webp that is already .webp-only path with no jpeg twin?
    // Still re-encode oversized webp once; skip tiny webp under 50kb later.
    return true;
  });

  console.log(`Found ${all.length} objects, ${candidates.length} convertible`);

  const urlMap = new Map<string, string>();
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  const toDelete: string[] = [];

  for (const objectPath of candidates) {
    if (converted + skipped + failed >= limit) break;

    const webpPath = toWebpPath(objectPath);
    const alreadyWebp = objectPath === webpPath;

    const { data: blob, error: dlError } = await supabase.storage
      .from(BUCKET)
      .download(objectPath);
    if (dlError || !blob) {
      console.warn(`  ✗ download ${objectPath}: ${dlError?.message}`);
      failed += 1;
      continue;
    }

    const input = Buffer.from(await blob.arrayBuffer());
    bytesIn += input.length;

    // Skip tiny already-webp
    if (alreadyWebp && input.length < 40_000) {
      skipped += 1;
      continue;
    }

    let output: Buffer;
    try {
      const result = await convertBuffer(input);
      output = result.data;
    } catch (err) {
      console.warn(
        `  ✗ convert ${objectPath}: ${err instanceof Error ? err.message : err}`,
      );
      failed += 1;
      continue;
    }

    // If webp not smaller enough for png icons, still keep webp for consistency unless larger by >5%
    if (output.length > input.length * 1.05 && !alreadyWebp) {
      console.log(
        `  · keep original (webp larger) ${objectPath} ${input.length} → ${output.length}`,
      );
      skipped += 1;
      continue;
    }

    bytesOut += output.length;
    const fromUrl = publicUrl(objectPath);
    const toUrl = publicUrl(webpPath);

    if (dryRun) {
      console.log(
        `  [dry] ${objectPath} → ${webpPath} (${(input.length / 1024).toFixed(0)}KB → ${(output.length / 1024).toFixed(0)}KB)`,
      );
      urlMap.set(fromUrl, toUrl);
      if (!alreadyWebp) toDelete.push(objectPath);
      converted += 1;
      continue;
    }

    const { error: upError } = await supabase.storage.from(BUCKET).upload(webpPath, output, {
      upsert: true,
      contentType: "image/webp",
      cacheControl: "31536000",
    });
    if (upError) {
      console.warn(`  ✗ upload ${webpPath}: ${upError.message}`);
      failed += 1;
      continue;
    }

    urlMap.set(fromUrl, toUrl);
    if (!alreadyWebp) toDelete.push(objectPath);
    converted += 1;
    if (converted % 25 === 0) {
      console.log(`  … ${converted} converted`);
    }
  }

  await rewriteDatabase(urlMap);

  if (!dryRun && toDelete.length) {
    console.log(`\nDeleting ${toDelete.length} original objects...`);
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50);
      const { error } = await supabase.storage.from(BUCKET).remove(chunk);
      if (error) console.warn(`  ✗ delete chunk: ${error.message}`);
    }
  }

  const saved = bytesIn - bytesOut;
  console.log("\nDone.");
  console.log(`  converted: ${converted}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  failed:    ${failed}`);
  console.log(
    `  size: ${(bytesIn / 1024 / 1024).toFixed(1)} MB → ${(bytesOut / 1024 / 1024).toFixed(1)} MB (saved ${(saved / 1024 / 1024).toFixed(1)} MB)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
