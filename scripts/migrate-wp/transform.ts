import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ArticleBlock } from "../../src/types/content";
import { estimateReadTime, htmlToBlocks, stripTags } from "./html-to-blocks";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "out");
const PHASE2_DIR = path.join(OUT_DIR, "phase2");

const DEFAULT_AUTHOR = "Nguyễn Tiến Sử, MD, PhD, MBA";
const DEFAULT_AUTHOR_BIO =
  "Tốt nghiệp Bác Sĩ Đa Khoa (MD), tại Đại Học Y Dược TP. HCM, VIETNAM (1995). Tốt nghiệp Tiến Sĩ Y Khoa (PhD), ngành Y Học Ứng Dụng Gene, tại Tokyo Medical and Dental University, JAPAN (2007). Tốt nghiệp Thạc Sĩ Quản Trị Kinh Doanh (MBA), tại University of Queensland, AUSTRALIA (2012). Hiện đang công tác trong lĩnh vực nghiên cứu và phát triển thuốc mới.";

const MONTHS_VI = [
  "Tháng Một",
  "Tháng Hai",
  "Tháng Ba",
  "Tháng Tư",
  "Tháng Năm",
  "Tháng Sáu",
  "Tháng Bảy",
  "Tháng Tám",
  "Tháng Chín",
  "Tháng Mười",
  "Tháng Mười Một",
  "Tháng Mười Hai",
];

export type WpExtracted = {
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

export type WpCategory = {
  termTaxonomyId: number;
  termId: number;
  name: string;
  slug: string;
  parentTermId: number;
  parentSlug: string | null;
  count: number;
};

export type ArticleRow = {
  path: string;
  slug: string;
  year: string;
  month: string;
  day: string;
  title: string;
  category_label: string;
  category_href: string;
  date_label: string;
  datetime_label: string;
  read_time: string;
  image: string | null;
  excerpt: string | null;
  author: string;
  author_bio: string;
  layout: "card" | "wide" | null;
  blocks: ArticleBlock[];
  is_published: boolean;
  // migrate metadata (stripped before upsert)
  _wpId: number;
  _wpType: string;
  _sourcePriority: number;
};

export type CategoryRow = {
  slug: string;
  title: string;
  kind: "archive" | "glossary" | "subcategory";
  parent_slug: string | null;
  total_pages: number;
  sort_order: number;
};

export type CategoryArticleRow = {
  category_slug: string;
  article_path: string;
  sort_order: number;
  layout: "card" | "wide" | null;
};

export type GlossaryTabRow = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
};

export type GlossaryEntryRow = {
  tab_id: string;
  letter: string;
  text: string;
  href: string;
  sort_order: number;
  _wpId: number;
};

function nfc(s: string): string {
  return s.normalize("NFC");
}

function decodeAmpName(name: string): string {
  return nfc(name.replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim());
}

function loadJsonl(file: string): WpExtracted[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WpExtracted);
}

function formatDateLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const day = Number(m[3]);
  const month = Number(m[2]);
  return `${day} ${MONTHS_VI[month - 1]}, ${m[1]}`;
}

function formatDatetimeLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return `${formatDateLabel(iso)} 12:00 chiều`;
  const hour = Number(m[4]);
  const minute = m[5];
  const period = hour >= 12 ? "chiều" : "sáng";
  const h12 = hour % 12 || 12;
  return `${formatDateLabel(iso)} ${h12}:${minute} ${period}`;
}

function parsePath(p: string): { year: string; month: string; day: string; slug: string } | null {
  const m = p.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3], slug: m[4] };
}

/** Map WP category slug → app category slug + href. */
export function resolveCategoryTargets(
  cats: Array<{ name: string; slug: string }>,
  wpCategoriesBySlug: Map<string, WpCategory>,
): Array<{ slug: string; title: string; href: string }> {
  const results: Array<{ slug: string; title: string; href: string }> = [];
  const seen = new Set<string>();

  for (const cat of cats) {
    if (cat.slug === "draft") continue;
    const meta = wpCategoriesBySlug.get(cat.slug);
    const title = decodeAmpName(cat.name);
    const parentSlug = meta?.parentSlug ?? null;

    let appSlug: string;
    let href: string;

    if (!parentSlug) {
      // top-level archive
      if (cat.slug === "thuoc") {
        appSlug = "thuoc";
        href = "/thuoc";
      } else if (cat.slug === "lieu-phap-gene-te-bao") {
        appSlug = "lieu-phap-gene-te-bao";
        href = "/lieu-phap-gene-te-bao";
      } else if (cat.slug === "vaccines") {
        appSlug = "vaccines";
        href = "/vaccines";
      } else if (cat.slug === "tac-dung-phu") {
        appSlug = "tac-dung-phu";
        href = "/tac-dung-phu";
      } else if (cat.slug === "tin-khac") {
        appSlug = "tin-khac";
        href = "/tin-khac";
      } else {
        appSlug = cat.slug;
        href = `/${cat.slug}`;
      }
    } else if (parentSlug === "thuoc") {
      appSlug = `thuoc/${cat.slug}`;
      href = `/thuoc/${cat.slug}`;
    } else if (parentSlug === "lieu-phap-gene-te-bao") {
      appSlug = `lieu-phap-gene-te-bao/${cat.slug}`;
      href = `/lieu-phap-gene-te-bao/${cat.slug}`;
    } else {
      appSlug = `${parentSlug}/${cat.slug}`;
      href = `/${parentSlug}/${cat.slug}`;
    }

    if (!seen.has(appSlug)) {
      seen.add(appSlug);
      results.push({ slug: appSlug, title, href });
    }

    // also link parent archive
    if (parentSlug && !seen.has(parentSlug)) {
      seen.add(parentSlug);
      const parentMeta = wpCategoriesBySlug.get(parentSlug);
      results.push({
        slug: parentSlug,
        title: decodeAmpName(parentMeta?.name ?? parentSlug),
        href: `/${parentSlug}`,
      });
    }
  }

  return results;
}

function pickPrimaryCategory(
  targets: Array<{ slug: string; title: string; href: string }>,
): { label: string; href: string } {
  // Prefer subcategory over parent archive for label
  const sub = targets.find((t) => t.slug.includes("/"));
  if (sub) return { label: sub.title, href: sub.href };
  const top = targets[0];
  if (top) return { label: top.title, href: top.href };
  return { label: "Tin khác", href: "/tin-khac" };
}

function glossaryTabId(catName: string): string | null {
  const n = decodeAmpName(catName).toLowerCase();
  if (n.includes("bệnh học") || n.includes("benh hoc")) return "benh-hoc";
  if (n.includes("xét nghiệm") || n.includes("xet nghiem") || n.includes("chỉ số")) {
    return "xet-nghiem-chi-so";
  }
  if (n.includes("thuật ngữ") || n.includes("thuat ngu")) return "thuat-ngu";
  return null;
}

/** Keep in sync with src/lib/glossary.ts (glossaryLetterFromTitle). */
function glossaryLetter(title: string): string {
  const t = nfc(title).trim();
  if (!t) return "#";
  const ch = t[0]!.toUpperCase();
  if (ch === "Đ") return "Đ";
  // strip combining marks for grouping Latin letters
  const base = ch.normalize("NFD").replace(/\p{M}/gu, "");
  if (/[A-Z]/i.test(base)) return base.toUpperCase();
  return ch;
}

function excerptFrom(html: string, excerpt: string, blocks: ArticleBlock[]): string | null {
  const fromWp = stripTags(excerpt || "").trim();
  if (fromWp) return fromWp.slice(0, 300);
  const firstPara = blocks.find((b) => b.type === "paragraph" && b.text)?.text;
  return firstPara ? firstPara.slice(0, 300) : null;
}

function toArticleRow(
  item: WpExtracted,
  wpCategoriesBySlug: Map<string, WpCategory>,
  priority: number,
): ArticleRow | null {
  if (!item.path) return null;
  const parts = parsePath(item.path);
  if (!parts) return null;

  const blocks = htmlToBlocks(item.contentHtml || "");
  const targets = resolveCategoryTargets(item.categories, wpCategoriesBySlug);
  const primary = pickPrimaryCategory(targets);

  return {
    path: item.path,
    slug: parts.slug,
    year: parts.year,
    month: parts.month,
    day: parts.day,
    title: nfc(item.title),
    category_label: primary.label,
    category_href: primary.href,
    date_label: formatDateLabel(item.date),
    datetime_label: formatDatetimeLabel(item.date),
    read_time: estimateReadTime(blocks),
    image: item.featuredImageUrl || item.featuredImageFile || null,
    excerpt: excerptFrom(item.contentHtml, item.excerpt, blocks),
    author: nfc(item.authorDisplay || DEFAULT_AUTHOR),
    author_bio: DEFAULT_AUTHOR_BIO,
    layout: null,
    blocks,
    is_published: item.status === "publish",
    _wpId: item.wpId,
    _wpType: item.type,
    _sourcePriority: priority,
  };
}

export function transformPhase2(inputDir = OUT_DIR) {
  const posts = loadJsonl(path.join(inputDir, "posts.jsonl"));
  const glossary = loadJsonl(path.join(inputDir, "glossary.jsonl"));
  const encyclopedia = loadJsonl(path.join(inputDir, "encyclopedia.jsonl"));
  const wpCategories = JSON.parse(
    fs.readFileSync(path.join(inputDir, "categories.json"), "utf8"),
  ) as WpCategory[];

  const wpCategoriesBySlug = new Map(wpCategories.map((c) => [c.slug, c]));

  // Build category rows from WP (skip Draft)
  const categoryRows: CategoryRow[] = [];
  const glossaryTabs: GlossaryTabRow[] = [
    { id: "benh-hoc", label: "Bệnh học", href: "/benh-hoc", sort_order: 1 },
    {
      id: "xet-nghiem-chi-so",
      label: "Xét nghiệm & Chỉ số",
      href: "/xet-nghiem-chi-so",
      sort_order: 2,
    },
    { id: "thuat-ngu", label: "Thuật ngữ", href: "/thuat-ngu", sort_order: 3 },
  ];

  let sortOrder = 1;
  for (const cat of wpCategories) {
    if (cat.slug === "draft") continue;
    const title = decodeAmpName(cat.name);
    if (!cat.parentSlug) {
      const kind: CategoryRow["kind"] =
        cat.slug === "benh-hoc" ||
        cat.slug === "xet-nghiem-chi-so" ||
        cat.slug === "thuat-ngu"
          ? "glossary"
          : "archive";
      categoryRows.push({
        slug: cat.slug,
        title,
        kind,
        parent_slug: null,
        total_pages: Math.max(1, Math.ceil(Math.max(cat.count, 1) / 10)),
        sort_order: sortOrder++,
      });
    } else if (
      cat.parentSlug === "thuoc" ||
      cat.parentSlug === "lieu-phap-gene-te-bao"
    ) {
      categoryRows.push({
        slug: `${cat.parentSlug}/${cat.slug}`,
        title,
        kind: "subcategory",
        parent_slug: cat.parentSlug,
        total_pages: Math.max(1, Math.ceil(Math.max(cat.count, 1) / 10)),
        sort_order: sortOrder++,
      });
    }
  }

  // Ensure glossary archive categories exist
  for (const tab of glossaryTabs) {
    if (!categoryRows.some((c) => c.slug === tab.id)) {
      categoryRows.push({
        slug: tab.id,
        title: tab.label,
        kind: "glossary",
        parent_slug: null,
        total_pages: 1,
        sort_order: sortOrder++,
      });
    }
  }

  // Articles: priority post(1) > encyclopedia(2) > glossary(3)
  const articleMap = new Map<string, ArticleRow>();
  const skipped: Array<{ reason: string; wpId: number; type: string; path: string }> =
    [];

  function ingest(rows: WpExtracted[], priority: number) {
    for (const item of rows) {
      if (item.status !== "publish") {
        skipped.push({
          reason: `status:${item.status}`,
          wpId: item.wpId,
          type: item.type,
          path: item.path,
        });
        continue;
      }
      const row = toArticleRow(item, wpCategoriesBySlug, priority);
      if (!row) {
        skipped.push({
          reason: "invalid-path",
          wpId: item.wpId,
          type: item.type,
          path: item.path,
        });
        continue;
      }
      const existing = articleMap.get(row.path);
      if (!existing || priority < existing._sourcePriority) {
        articleMap.set(row.path, row);
      } else {
        skipped.push({
          reason: `path-collision-kept-${existing._wpType}:${existing._wpId}`,
          wpId: item.wpId,
          type: item.type,
          path: item.path,
        });
      }
    }
  }

  ingest(
    posts.filter((p) => p.status === "publish"),
    1,
  );
  ingest(
    encyclopedia.filter((p) => p.status === "publish"),
    2,
  );
  ingest(
    glossary.filter((p) => p.status === "publish"),
    3,
  );

  const articles = [...articleMap.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  // category_articles from posts only (primary content for archives)
  const categoryArticleRows: CategoryArticleRow[] = [];
  const sortByCat = new Map<string, number>();

  for (const item of posts.filter((p) => p.status === "publish" && p.path)) {
    if (!articleMap.has(item.path)) continue;
    const targets = resolveCategoryTargets(item.categories, wpCategoriesBySlug);
    for (const t of targets) {
      if (!categoryRows.some((c) => c.slug === t.slug)) continue;
      const order = sortByCat.get(t.slug) ?? 0;
      sortByCat.set(t.slug, order + 1);
      categoryArticleRows.push({
        category_slug: t.slug,
        article_path: item.path,
        sort_order: order,
        layout: null,
      });
    }
  }

  // Glossary entries (+ category_articles links for glossary categories)
  const glossaryEntries: GlossaryEntryRow[] = [];
  const letterSort = new Map<string, number>();
  let unmappedGlossaryCat = 0;

  for (const item of glossary.filter((g) => g.status === "publish")) {
    const cat =
      item.otherTaxonomies.find((t) => t.taxonomy === "glossary_cat")?.name ??
      "";
    const tabId = glossaryTabId(cat) ?? "thuat-ngu";
    if (!glossaryTabId(cat)) unmappedGlossaryCat++;

    const letter = glossaryLetter(item.title);
    const key = `${tabId}:${letter}`;
    const order = letterSort.get(key) ?? 0;
    letterSort.set(key, order + 1);

    glossaryEntries.push({
      tab_id: tabId,
      letter,
      text: nfc(item.title),
      href: item.path || "#",
      sort_order: order,
      _wpId: item.wpId,
    });

    // Primary source for public glossary pages: category_articles
    if (item.path && articleMap.has(item.path)) {
      const caOrder = sortByCat.get(tabId) ?? 0;
      sortByCat.set(tabId, caOrder + 1);
      categoryArticleRows.push({
        category_slug: tabId,
        article_path: item.path,
        sort_order: caOrder,
        layout: null,
      });
    }
  }

  glossaryEntries.sort((a, b) => {
    if (a.tab_id !== b.tab_id) return a.tab_id.localeCompare(b.tab_id);
    if (a.letter !== b.letter) return a.letter.localeCompare(b.letter, "vi");
    return a.sort_order - b.sort_order;
  });

  const emptyBlocks = articles.filter((a) => a.blocks.length === 0);
  const blockStats = {
    totalBlocks: articles.reduce((n, a) => n + a.blocks.length, 0),
    avgBlocks:
      articles.length === 0
        ? 0
        : Number(
            (
              articles.reduce((n, a) => n + a.blocks.length, 0) / articles.length
            ).toFixed(1),
          ),
    emptyBlocks: emptyBlocks.length,
    byType: articles.reduce(
      (acc, a) => {
        acc[a._wpType] = (acc[a._wpType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    counts: {
      articles: articles.length,
      categories: categoryRows.length,
      categoryArticles: categoryArticleRows.length,
      glossaryTabs: glossaryTabs.length,
      glossaryEntries: glossaryEntries.length,
      skipped: skipped.length,
      unmappedGlossaryCat,
    },
    blockStats,
    collisions: skipped.filter((s) => s.reason.startsWith("path-collision")),
    emptyBlockSamples: emptyBlocks.slice(0, 10).map((a) => ({
      path: a.path,
      title: a.title,
      wpType: a._wpType,
      wpId: a._wpId,
    })),
    sampleArticles: articles.slice(0, 3).map((a) => ({
      path: a.path,
      title: a.title,
      category_label: a.category_label,
      category_href: a.category_href,
      blocks: a.blocks.length,
      image: a.image,
      read_time: a.read_time,
      firstBlocks: a.blocks.slice(0, 3),
    })),
    sampleGlossary: glossaryEntries.slice(0, 5),
  };

  return {
    articles,
    categories: categoryRows,
    categoryArticles: categoryArticleRows,
    glossaryTabs,
    glossaryEntries,
    skipped,
    report,
  };
}

export function writePhase2Artifacts(
  result: ReturnType<typeof transformPhase2>,
  dir = PHASE2_DIR,
) {
  fs.mkdirSync(dir, { recursive: true });

  const articlesPublic = result.articles.map(
    ({ _wpId, _wpType, _sourcePriority, ...row }) => ({
      ...row,
      _meta: { wpId: _wpId, wpType: _wpType, sourcePriority: _sourcePriority },
    }),
  );

  fs.writeFileSync(
    path.join(dir, "articles.jsonl"),
    articlesPublic.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "categories.json"),
    JSON.stringify(result.categories, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "category_articles.jsonl"),
    result.categoryArticles.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "glossary_tabs.json"),
    JSON.stringify(result.glossaryTabs, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "glossary_entries.jsonl"),
    result.glossaryEntries.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "skipped.jsonl"),
    result.skipped.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "report.json"),
    JSON.stringify(result.report, null, 2),
    "utf8",
  );

  // Small review samples (full pretty dump of all articles is too large)
  fs.writeFileSync(
    path.join(dir, "samples.json"),
    JSON.stringify(
      {
        articles: result.articles.slice(0, 5).map(
          ({ _wpId, _wpType, _sourcePriority, ...row }) => ({
            ...row,
            _meta: { wpId: _wpId, wpType: _wpType },
          }),
        ),
        glossaryEntries: result.glossaryEntries.slice(0, 10),
        categories: result.categories.slice(0, 20),
      },
      null,
      2,
    ),
    "utf8",
  );

  return dir;
}
