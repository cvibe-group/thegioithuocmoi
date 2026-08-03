/**
 * Phase 1: Extract WordPress content from WPvivid SQL dump → JSON preview.
 *
 * Usage:
 *   npx tsx scripts/migrate-wp/extract-preview.ts
 *   npx tsx scripts/migrate-wp/extract-preview.ts --dump-dir "C:/path/to/backup_db"
 *
 * Outputs under scripts/migrate-wp/out/:
 *   summary.json
 *   categories.json
 *   posts.jsonl / glossary.jsonl / encyclopedia.jsonl
 *   samples/*.json
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  buildPermalinkPath,
  decodeWpSlug,
  parseInsertValues,
} from "./parse-mysql-values";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(__dirname, "out");
const SAMPLES_DIR = path.join(OUT_DIR, "samples");

const DEFAULT_DUMP_DIR =
  "C:/Users/Admin/Downloads/thegioithuocmoi.com_wpvivid-2d17ca780aa07_2026-08-03-08-36_backup_db";
const PREFIX = "o3K6G_";
const TARGET_TYPES = new Set(["post", "glossary", "encyclopedia"]);
const KEEP_STATUSES = new Set(["publish", "draft", "private", "pending", "future"]);

type Term = { id: number; name: string; slug: string };
type TermTaxonomy = {
  id: number;
  termId: number;
  taxonomy: string;
  description: string;
  parent: number;
  count: number;
};
type User = { id: number; login: string; nicename: string; email: string; displayName: string };

type ExtractedPost = {
  wpId: number;
  type: string;
  status: string;
  title: string;
  slug: string;
  path: string;
  date: string;
  modified: string;
  excerpt: string;
  contentHtml: string;
  contentLength: number;
  authorId: number;
  authorLogin: string | null;
  authorDisplay: string | null;
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
  otherTaxonomies: Array<{ taxonomy: string; name: string; slug: string }>;
  thumbnailId: number | null;
  featuredImageUrl: string | null;
  featuredImageFile: string | null;
  guid: string;
};

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

function insertPrefix(table: string): string {
  return `INSERT INTO \`${PREFIX}${table}\``;
}

function num(v: string | null | undefined): number {
  return Number(v ?? 0);
}

function str(v: string | null | undefined): string {
  return v ?? "";
}

async function streamDump(
  dumpPath: string,
  onLine: (line: string) => void,
): Promise<void> {
  const rl = readline.createInterface({
    input: fs.createReadStream(dumpPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (line.startsWith("INSERT INTO `")) onLine(line);
  }
}

function findPartFiles(dumpDir: string): string[] {
  const files = fs
    .readdirSync(dumpDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((f) => path.join(dumpDir, f));
}

async function main() {
  const dumpDir = argValue("--dump-dir") ?? DEFAULT_DUMP_DIR;
  if (!fs.existsSync(dumpDir)) {
    throw new Error(`Dump dir not found: ${dumpDir}`);
  }

  fs.mkdirSync(SAMPLES_DIR, { recursive: true });

  const terms = new Map<number, Term>();
  const termTaxonomies = new Map<number, TermTaxonomy>();
  /** object_id (post) → term_taxonomy_ids */
  const relationships = new Map<number, number[]>();
  const users = new Map<number, User>();
  /** post_id → meta */
  const thumbnailByPost = new Map<number, number>();
  const attachedFileByPost = new Map<number, string>();
  /** attachment post id → guid / url */
  const attachmentGuid = new Map<number, string>();

  const postsRaw: Array<{
    id: number;
    author: number;
    date: string;
    content: string;
    title: string;
    excerpt: string;
    status: string;
    name: string;
    modified: string;
    parent: number;
    guid: string;
    type: string;
    mime: string;
  }> = [];

  let linesSeen = 0;
  const partFiles = findPartFiles(dumpDir);
  console.log(`Dump parts (${partFiles.length}):`);
  for (const f of partFiles) console.log(`  - ${path.basename(f)}`);

  for (const part of partFiles) {
    console.log(`Scanning ${path.basename(part)}...`);
    await streamDump(part, (line) => {
      linesSeen++;

      if (line.startsWith(insertPrefix("terms"))) {
        const f = parseInsertValues(line);
        if (!f || f.length < 4) return;
        const id = num(f[0]);
        terms.set(id, { id, name: str(f[1]), slug: decodeWpSlug(str(f[2])) });
        return;
      }

      if (line.startsWith(insertPrefix("term_taxonomy"))) {
        const f = parseInsertValues(line);
        if (!f || f.length < 6) return;
        const id = num(f[0]);
        termTaxonomies.set(id, {
          id,
          termId: num(f[1]),
          taxonomy: str(f[2]),
          description: str(f[3]),
          parent: num(f[4]),
          count: num(f[5]),
        });
        return;
      }

      if (line.startsWith(insertPrefix("term_relationships"))) {
        const f = parseInsertValues(line);
        if (!f || f.length < 2) return;
        const objectId = num(f[0]);
        const ttId = num(f[1]);
        const list = relationships.get(objectId) ?? [];
        list.push(ttId);
        relationships.set(objectId, list);
        return;
      }

      if (line.startsWith(insertPrefix("users"))) {
        const f = parseInsertValues(line);
        // ID, login, pass, nicename, email, url, registered, activation_key, status, display_name
        if (!f || f.length < 10) return;
        const id = num(f[0]);
        users.set(id, {
          id,
          login: str(f[1]),
          nicename: str(f[3]),
          email: str(f[4]),
          displayName: str(f[9]),
        });
        return;
      }

      if (line.startsWith(insertPrefix("postmeta"))) {
        const f = parseInsertValues(line);
        // meta_id, post_id, meta_key, meta_value
        if (!f || f.length < 4) return;
        const postId = num(f[1]);
        const key = str(f[2]);
        const value = str(f[3]);
        if (key === "_thumbnail_id" && value) {
          const thumbId = Number(value);
          if (Number.isFinite(thumbId) && thumbId > 0) {
            thumbnailByPost.set(postId, thumbId);
          }
        } else if (key === "_wp_attached_file" && value) {
          attachedFileByPost.set(postId, value);
        }
        return;
      }

      if (line.startsWith(insertPrefix("posts"))) {
        const f = parseInsertValues(line);
        // 0 ID, 1 author, 2 date, 3 date_gmt, 4 content, 5 title, 6 excerpt,
        // 7 status, 8 comment_status, 9 ping_status, 10 password, 11 name,
        // 12 to_ping, 13 pinged, 14 modified, 15 modified_gmt, 16 content_filtered,
        // 17 parent, 18 guid, 19 menu_order, 20 type, 21 mime, 22 comment_count
        if (!f || f.length < 22) return;
        const type = str(f[20]);
        const status = str(f[7]);
        const id = num(f[0]);

        if (type === "attachment") {
          attachmentGuid.set(id, str(f[18]));
          return;
        }

        if (!TARGET_TYPES.has(type)) return;
        if (!KEEP_STATUSES.has(status)) return;

        postsRaw.push({
          id,
          author: num(f[1]),
          date: str(f[2]),
          content: str(f[4]),
          title: str(f[5]),
          excerpt: str(f[6]),
          status,
          name: str(f[11]),
          modified: str(f[14]),
          parent: num(f[17]),
          guid: str(f[18]),
          type,
          mime: str(f[21]),
        });
      }
    });
  }

  console.log(`INSERT lines scanned: ${linesSeen}`);
  console.log(`Raw target posts collected: ${postsRaw.length}`);

  function taxonomiesForPost(postId: number) {
    const categories: Array<{ name: string; slug: string }> = [];
    const tags: Array<{ name: string; slug: string }> = [];
    const otherTaxonomies: Array<{ taxonomy: string; name: string; slug: string }> =
      [];

    for (const ttId of relationships.get(postId) ?? []) {
      const tt = termTaxonomies.get(ttId);
      if (!tt) continue;
      const term = terms.get(tt.termId);
      if (!term) continue;
      const item = { name: term.name, slug: term.slug };
      if (tt.taxonomy === "category") categories.push(item);
      else if (tt.taxonomy === "post_tag") tags.push(item);
      else otherTaxonomies.push({ taxonomy: tt.taxonomy, ...item });
    }
    return { categories, tags, otherTaxonomies };
  }

  function resolveFeatured(postId: number): {
    thumbnailId: number | null;
    featuredImageUrl: string | null;
    featuredImageFile: string | null;
  } {
    const thumbId = thumbnailByPost.get(postId) ?? null;
    if (!thumbId) {
      return { thumbnailId: null, featuredImageUrl: null, featuredImageFile: null };
    }
    return {
      thumbnailId: thumbId,
      featuredImageUrl: attachmentGuid.get(thumbId) ?? null,
      featuredImageFile: attachedFileByPost.get(thumbId) ?? null,
    };
  }

  const extracted: ExtractedPost[] = postsRaw.map((p) => {
    const user = users.get(p.author);
    const tax = taxonomiesForPost(p.id);
    const feat = resolveFeatured(p.id);
    const slug = decodeWpSlug(p.name);
    return {
      wpId: p.id,
      type: p.type,
      status: p.status,
      title: p.title,
      slug,
      path: buildPermalinkPath(p.date, p.name),
      date: p.date,
      modified: p.modified,
      excerpt: p.excerpt,
      contentHtml: p.content,
      contentLength: p.content.length,
      authorId: p.author,
      authorLogin: user?.login ?? null,
      authorDisplay: user?.displayName ?? null,
      categories: tax.categories,
      tags: tax.tags,
      otherTaxonomies: tax.otherTaxonomies,
      thumbnailId: feat.thumbnailId,
      featuredImageUrl: feat.featuredImageUrl,
      featuredImageFile: feat.featuredImageFile,
      guid: p.guid,
    };
  });

  // Write JSONL by type (published first ordering)
  const byType: Record<string, ExtractedPost[]> = {
    post: [],
    glossary: [],
    encyclopedia: [],
  };
  for (const item of extracted) {
    byType[item.type]?.push(item);
  }
  for (const list of Object.values(byType)) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }

  function writeJsonl(file: string, rows: ExtractedPost[]) {
    const stream = fs.createWriteStream(file, { encoding: "utf8" });
    for (const row of rows) {
      stream.write(`${JSON.stringify(row)}\n`);
    }
    stream.end();
  }

  writeJsonl(path.join(OUT_DIR, "posts.jsonl"), byType.post);
  writeJsonl(path.join(OUT_DIR, "glossary.jsonl"), byType.glossary);
  writeJsonl(path.join(OUT_DIR, "encyclopedia.jsonl"), byType.encyclopedia);

  // Categories tree (category taxonomy only)
  const categoryNodes = [...termTaxonomies.values()]
    .filter((tt) => tt.taxonomy === "category")
    .map((tt) => {
      const term = terms.get(tt.termId);
      const parentTt = tt.parent
        ? [...termTaxonomies.values()].find(
            (x) => x.taxonomy === "category" && x.termId === tt.parent,
          )
        : undefined;
      // WP term_taxonomy.parent references term_id of parent term, not tt id
      const parentTerm = tt.parent ? terms.get(tt.parent) : undefined;
      return {
        termTaxonomyId: tt.id,
        termId: tt.termId,
        name: term?.name ?? "",
        slug: term?.slug ?? "",
        parentTermId: tt.parent,
        parentSlug: parentTerm?.slug ?? null,
        count: tt.count,
        description: tt.description,
        parentTtId: parentTt?.id ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  fs.writeFileSync(
    path.join(OUT_DIR, "categories.json"),
    JSON.stringify(categoryNodes, null, 2),
    "utf8",
  );

  // Samples: 3 publish per type with content
  for (const type of TARGET_TYPES) {
    const samples = (byType[type] ?? [])
      .filter((p) => p.status === "publish")
      .slice(-3);
    fs.writeFileSync(
      path.join(SAMPLES_DIR, `${type}.json`),
      JSON.stringify(samples, null, 2),
      "utf8",
    );
  }

  // Summary stats
  function statusCounts(rows: ExtractedPost[]) {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }

  function dateRange(rows: ExtractedPost[]) {
    const dates = rows.map((r) => r.date).filter(Boolean).sort();
    return dates.length
      ? { min: dates[0], max: dates[dates.length - 1] }
      : null;
  }

  const publishPosts = byType.post.filter((p) => p.status === "publish");
  const categoryUsage: Record<string, number> = {};
  for (const p of publishPosts) {
    for (const c of p.categories) {
      categoryUsage[c.name] = (categoryUsage[c.name] ?? 0) + 1;
    }
  }
  const topCategories = Object.entries(categoryUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }));

  const withImage = extracted.filter((p) => p.featuredImageUrl || p.featuredImageFile);
  const missingPath = extracted.filter((p) => !p.path);
  const emptyContent = extracted.filter((p) => p.contentLength === 0);

  const taxonomyCounts: Record<string, number> = {};
  for (const tt of termTaxonomies.values()) {
    taxonomyCounts[tt.taxonomy] = (taxonomyCounts[tt.taxonomy] ?? 0) + 1;
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    dumpDir,
    prefix: PREFIX,
    targetTypes: [...TARGET_TYPES],
    counts: {
      posts: {
        total: byType.post.length,
        byStatus: statusCounts(byType.post),
        dateRange: dateRange(byType.post),
      },
      glossary: {
        total: byType.glossary.length,
        byStatus: statusCounts(byType.glossary),
        dateRange: dateRange(byType.glossary),
      },
      encyclopedia: {
        total: byType.encyclopedia.length,
        byStatus: statusCounts(byType.encyclopedia),
        dateRange: dateRange(byType.encyclopedia),
      },
      categories: categoryNodes.length,
      users: users.size,
      attachmentsIndexed: attachmentGuid.size,
      withFeaturedImage: withImage.length,
      missingPermalinkPath: missingPath.length,
      emptyContent: emptyContent.length,
    },
    taxonomyCounts,
    topCategories,
    users: [...users.values()].map((u) => ({
      id: u.id,
      login: u.login,
      displayName: u.displayName,
      email: u.email,
    })),
    outputs: {
      summary: "scripts/migrate-wp/out/summary.json",
      categories: "scripts/migrate-wp/out/categories.json",
      posts: "scripts/migrate-wp/out/posts.jsonl",
      glossary: "scripts/migrate-wp/out/glossary.jsonl",
      encyclopedia: "scripts/migrate-wp/out/encyclopedia.jsonl",
      samples: "scripts/migrate-wp/out/samples/",
    },
    notes: [
      "Phase 1 only — no Supabase writes.",
      "contentHtml is raw WordPress HTML (Gutenberg comments may be present).",
      "path follows /YYYY/MM/DD/slug from post_date + post_name.",
      "Featured images resolved via _thumbnail_id → attachment guid / _wp_attached_file.",
      "part002 is mostly post_views and is skipped for content tables if present.",
    ],
  };

  fs.writeFileSync(
    path.join(OUT_DIR, "summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );

  // Lightweight index without HTML for quick browsing
  const index = extracted.map((p) => ({
    wpId: p.wpId,
    type: p.type,
    status: p.status,
    title: p.title,
    path: p.path,
    date: p.date,
    categories: p.categories.map((c) => c.name),
    contentLength: p.contentLength,
    hasImage: Boolean(p.featuredImageUrl || p.featuredImageFile),
    authorDisplay: p.authorDisplay,
  }));
  fs.writeFileSync(
    path.join(OUT_DIR, "index.json"),
    JSON.stringify(index, null, 2),
    "utf8",
  );

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary.counts, null, 2));
  console.log("\nTop categories (published posts):");
  for (const row of topCategories.slice(0, 15)) {
    console.log(`  ${row.count.toString().padStart(4)}  ${row.name}`);
  }
  console.log(`\nWrote outputs to ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
