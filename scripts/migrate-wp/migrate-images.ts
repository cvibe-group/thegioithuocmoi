/**
 * Phase 3: Download WP images → Supabase Storage → rewrite article.image / blocks / content_html.
 *
 * Usage:
 *   npx tsx scripts/migrate-wp/migrate-images.ts
 *   npx tsx scripts/migrate-wp/migrate-images.ts --limit 20
 *   npx tsx scripts/migrate-wp/migrate-images.ts --dry-run
 *
 * Prefer SUPABASE_SERVICE_ROLE_KEY in .env.local (bypasses RLS). Falls back to anon.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
config({ path: path.join(ROOT, ".env.local") });
config();

const BUCKET = "images";
const REMOTE_PREFIX = "thegioithuocmoi/wp-uploads";
const CONCURRENCY = 6;
const WP_URL_RE =
  /https?:\/\/(?:www\.)?thegioithuocmoi\.com\/wp-content\/uploads\/[^"'\\\s)]+/gi;

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
    // Storage keys must be ASCII-safe; slugify non-ASCII filename parts.
    const safeRel = rel
      .split("/")
      .map((segment) => {
        if (!segment) return segment;
        if (/^[\w.\-]+$/.test(segment)) return segment;
        const ext = path.extname(segment);
        const base = path.basename(segment, ext);
        const slug = base
          .normalize("NFKD")
          .replace(/[^\w.\-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);
        return `${slug || "image"}${ext.toLowerCase()}`;
      })
      .join("/");
    return `${REMOTE_PREFIX}/${safeRel}`;
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

function collectWpUrls(...parts: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const match of part.matchAll(WP_URL_RE)) {
      found.add(match[0].replace(/\\+$/, ""));
    }
  }
  return [...found];
}

function rewriteWpUrls(input: string, supabaseUrl: string): string {
  return input.replace(WP_URL_RE, (match) => {
    const objectPath = wpUrlToObjectPath(match);
    if (!objectPath) return match;
    return publicUrl(supabaseUrl, objectPath);
  });
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
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or API key");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "Warning: SUPABASE_SERVICE_ROLE_KEY missing — using anon (needs temp policies).",
    );
  }

  const dryRun = hasFlag("--dry-run");
  const limit = Number(argValue("--limit") ?? "0") || 0;
  const supabase = createClient(url, key);

  console.log("Loading articles (image + blocks + content_html)...");
  type ArticleRow = {
    path: string;
    image: string | null;
    blocks: unknown;
    content_html: string | null;
  };
  const articles: ArticleRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("articles")
      .select("path, image, blocks, content_html")
      .range(from, to);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ArticleRow[];
    articles.push(...batch);
    console.log(`  loaded ${articles.length}...`);
    if (batch.length < pageSize) break;
  }

  type Job = { sourceUrl: string; objectPath: string };
  const byObject = new Map<string, Job>();

  for (const row of articles ?? []) {
    const urls = collectWpUrls(
      row.image,
      JSON.stringify(row.blocks ?? []),
      row.content_html,
    );
    for (const sourceUrl of urls) {
      const objectPath = wpUrlToObjectPath(sourceUrl);
      if (!objectPath) {
        console.warn(`  skip unmapped image: ${sourceUrl}`);
        continue;
      }
      if (!byObject.has(objectPath)) {
        byObject.set(objectPath, { sourceUrl, objectPath });
      }
    }
  }

  let jobs = [...byObject.values()];
  if (limit > 0) jobs = jobs.slice(0, limit);

  console.log(`Unique WP images to migrate: ${jobs.length}`);
  if (dryRun) {
    console.log(jobs.slice(0, 15));
    console.log("Dry-run only.");
    return;
  }

  const report = {
    uploaded: 0,
    skippedExisting: 0,
    failed: [] as Array<{ url: string; error: string }>,
    rewrittenArticles: 0,
  };

  console.log(`Downloading + uploading (concurrency=${CONCURRENCY})...`);
  await mapPool(jobs, CONCURRENCY, async (job, index) => {
    try {
      const { data: listed } = await supabase.storage
        .from(BUCKET)
        .list(path.dirname(job.objectPath).replace(/\\/g, "/"), {
          search: path.basename(job.objectPath),
          limit: 20,
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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

      if ((index + 1) % 25 === 0 || index === jobs.length - 1) {
        console.log(`  ... ${index + 1}/${jobs.length} (up:${report.uploaded} skip:${report.skippedExisting} fail:${report.failed.length})`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      report.failed.push({ url: job.sourceUrl, error: message });
      console.warn(`  ✗ ${job.sourceUrl}: ${message}`);
    }
  });

  console.log("Rewriting article.image / blocks / content_html URLs...");
  for (const row of articles ?? []) {
    const imageNext =
      row.image &&
      (row.image.includes("thegioithuocmoi.com") ||
        row.image.includes("/wp-content/uploads/"))
        ? (() => {
            const objectPath = wpUrlToObjectPath(row.image);
            return objectPath ? publicUrl(url, objectPath) : row.image;
          })()
        : row.image;

    const blocksRaw = JSON.stringify(row.blocks ?? []);
    const blocksNext = blocksRaw.includes("/wp-content/uploads/")
      ? rewriteWpUrls(blocksRaw, url)
      : blocksRaw;

    const html = row.content_html ?? "";
    const htmlNext = html.includes("/wp-content/uploads/")
      ? rewriteWpUrls(html, url)
      : html;

    const patch: Record<string, unknown> = {};
    if (imageNext && imageNext !== row.image) patch.image = imageNext;
    if (blocksNext !== blocksRaw) patch.blocks = JSON.parse(blocksNext);
    if (htmlNext !== html) patch.content_html = htmlNext;
    if (Object.keys(patch).length === 0) continue;

    const { error: updErr } = await supabase
      .from("articles")
      .update(patch)
      .eq("path", row.path);
    if (updErr) {
      console.warn(`  rewrite failed ${row.path}: ${updErr.message}`);
      continue;
    }
    report.rewrittenArticles++;
  }

  const outPath = path.join(__dirname, "out", "phase3-images-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log("\n=== REPORT ===");
  console.log(
    JSON.stringify(
      {
        ...report,
        failedSample: report.failed.slice(0, 10),
        failedCount: report.failed.length,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path.relative(ROOT, outPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
