/**
 * Phase 3: Download WP featured images → Supabase Storage → rewrite article.image (+ blocks URLs).
 *
 * Usage:
 *   npx tsx scripts/migrate-wp/migrate-images.ts
 *   npx tsx scripts/migrate-wp/migrate-images.ts --limit 20   # smoke test
 *   npx tsx scripts/migrate-wp/migrate-images.ts --dry-run    # list only
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
config({ path: path.join(ROOT, ".env.local") });

const BUCKET = "images";
const REMOTE_PREFIX = "thegioithuocmoi/wp-uploads";
const CONCURRENCY = 6;

const mimeByExt: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function publicUrl(supabaseUrl: string, objectPath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/** Map WP URL → storage object path under REMOTE_PREFIX. */
export function wpUrlToObjectPath(imageUrl: string): string | null {
  try {
    const raw = imageUrl.startsWith("//")
      ? `https:${imageUrl}`
      : imageUrl.startsWith("http")
        ? imageUrl
        : `https://thegioithuocmoi.com/${imageUrl.replace(/^\//, "")}`;
    const u = new URL(raw);
    const marker = "/wp-content/uploads/";
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    const rel = decodeURIComponent(u.pathname.slice(idx + marker.length));
    if (!rel || rel.includes("..")) return null;
    return `${REMOTE_PREFIX}/${rel}`;
  } catch {
    return null;
  }
}

function extFromPath(objectPath: string): string {
  return path.extname(objectPath).toLowerCase();
}

function mimeFromContentType(ct: string | null, objectPath: string): string {
  if (ct) {
    const base = ct.split(";")[0]?.trim().toLowerCase();
    if (base && base.startsWith("image/")) return base;
  }
  return mimeByExt[extFromPath(objectPath)] ?? "application/octet-stream";
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key");
  }

  const dryRun = hasFlag("--dry-run");
  const limit = Number(argValue("--limit") ?? "0") || 0;
  const supabase = createClient(url, key);

  console.log("Loading articles with featured images...");
  const { data: articles, error } = await supabase
    .from("articles")
    .select("path, image, blocks")
    .not("image", "is", null);
  if (error) throw new Error(error.message);

  type Job = { sourceUrl: string; objectPath: string; articlePaths: string[] };
  const byObject = new Map<string, Job>();

  for (const row of articles ?? []) {
    if (!row.image) continue;
    if (!row.image.includes("thegioithuocmoi.com") && !row.image.includes("/wp-content/uploads/")) {
      continue;
    }
    const objectPath = wpUrlToObjectPath(row.image);
    if (!objectPath) {
      console.warn(`  skip unmapped image: ${row.image}`);
      continue;
    }
    const existing = byObject.get(objectPath);
    if (existing) {
      existing.articlePaths.push(row.path);
    } else {
      byObject.set(objectPath, {
        sourceUrl: row.image,
        objectPath,
        articlePaths: [row.path],
      });
    }
  }

  let jobs = [...byObject.values()];
  if (limit > 0) jobs = jobs.slice(0, limit);

  console.log(`Unique images to migrate: ${jobs.length}`);
  if (dryRun) {
    console.log(jobs.slice(0, 10));
    console.log("Dry-run only.");
    return;
  }

  const report = {
    uploaded: 0,
    skippedExisting: 0,
    failed: [] as Array<{ url: string; error: string }>,
    rewrittenArticles: 0,
    rewrittenBlocks: 0,
  };

  const cacheDir = path.join(__dirname, "out", "image-cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  console.log(`Downloading + uploading (concurrency=${CONCURRENCY})...`);
  await mapPool(jobs, CONCURRENCY, async (job, index) => {
    try {
      // Skip if already on storage (idempotent)
      const { data: listed } = await supabase.storage
        .from(BUCKET)
        .list(path.dirname(job.objectPath), {
          search: path.basename(job.objectPath),
          limit: 5,
        });
      const already = listed?.some((f) => f.name === path.basename(job.objectPath));
      if (!already) {
        const res = await fetch(job.sourceUrl, {
          headers: {
            "User-Agent": "thegioithuocmoi-migrate/1.0",
            Accept: "image/*,*/*",
          },
          redirect: "follow",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = mimeFromContentType(
          res.headers.get("content-type"),
          job.objectPath,
        );
        if (!contentType.startsWith("image/")) {
          throw new Error(`Not an image: ${contentType}`);
        }

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(job.objectPath, buf, {
            contentType,
            upsert: true,
            cacheControl: "31536000",
          });
        if (upErr) throw new Error(upErr.message);
        report.uploaded++;
      } else {
        report.skippedExisting++;
      }

      const nextUrl = publicUrl(url, job.objectPath);
      for (const articlePath of job.articlePaths) {
        const { error: updErr } = await supabase
          .from("articles")
          .update({ image: nextUrl })
          .eq("path", articlePath)
          .eq("image", job.sourceUrl);
        if (updErr) throw new Error(`update ${articlePath}: ${updErr.message}`);
        report.rewrittenArticles++;
      }

      if ((index + 1) % 25 === 0 || index === jobs.length - 1) {
        console.log(`  ... ${index + 1}/${jobs.length}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ url: job.sourceUrl, error: message });
      console.warn(`  ✗ ${job.sourceUrl}: ${message}`);
    }
  });

  // Rewrite leftover wp-content URLs inside blocks JSON
  console.log("Scanning blocks for wp-content URLs...");
  const { data: withBlocks, error: blocksErr } = await supabase
    .from("articles")
    .select("path, blocks")
    .not("blocks", "eq", "[]");
  if (blocksErr) throw new Error(blocksErr.message);

  for (const row of withBlocks ?? []) {
    const raw = JSON.stringify(row.blocks ?? []);
    if (!raw.includes("/wp-content/uploads/")) continue;

    let changed = false;
    const next = raw.replace(
      /https?:\/\/thegioithuocmoi\.com\/wp-content\/uploads\/[^"\\]+/g,
      (match) => {
        const objectPath = wpUrlToObjectPath(match);
        if (!objectPath) return match;
        changed = true;
        return publicUrl(url, objectPath);
      },
    );
    if (!changed) continue;

    const { error: updErr } = await supabase
      .from("articles")
      .update({ blocks: JSON.parse(next) })
      .eq("path", row.path);
    if (updErr) {
      console.warn(`  blocks rewrite failed ${row.path}: ${updErr.message}`);
      continue;
    }
    report.rewrittenBlocks++;
  }

  const outPath = path.join(__dirname, "out", "phase3-images-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log("\n=== REPORT ===");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
