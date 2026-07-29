import { cache } from "react";
import { createDataClient, isSupabaseConfigured } from "@/lib/supabase/data";
import { glossaryLetterFromTitle } from "@/lib/glossary";
import {
  articlePathVariants,
  normalizeArticleHref,
} from "@/lib/unicode-path";
import type {
  Article,
  ArticleBlock,
  ArticleDetail,
  ArticleSection,
  CategoryPageData,
  GlossaryPageData,
  GlossaryTooltipTerm,
  NavItem,
  SidebarPanel,
} from "@/types/content";

type ArticleRow = {
  path: string;
  slug: string;
  year: string;
  month: string;
  day: string;
  title: string;
  category_label: string;
  category_href: string;
  date_label: string;
  datetime_label: string | null;
  read_time: string;
  image: string | null;
  excerpt: string | null;
  author: string | null;
  author_bio: string | null;
  layout: "card" | "wide" | null;
  blocks: ArticleBlock[] | null;
};

function mapArticle(row: ArticleRow, layoutOverride?: string | null): Article {
  return {
    category: row.category_label,
    title: row.title,
    date: row.date_label,
    readTime: row.read_time,
    image: row.image ?? undefined,
    href: normalizeArticleHref(row.path),
    excerpt: row.excerpt ?? undefined,
    author: row.author ?? undefined,
    layout:
      (layoutOverride === "card" || layoutOverride === "wide"
        ? layoutOverride
        : undefined) ??
      row.layout ??
      undefined,
  };
}

function mapDetail(row: ArticleRow, related: Article[] = []): ArticleDetail {
  return {
    slug: row.slug.normalize("NFC"),
    year: row.year,
    month: row.month,
    day: row.day,
    category: row.category_label,
    categoryHref: normalizeArticleHref(row.category_href),
    title: row.title,
    date: row.date_label,
    datetime: row.datetime_label ?? `${row.date_label} 12:21 chiều`,
    readTime: row.read_time,
    image: row.image ?? undefined,
    author: row.author ?? "Nguyễn Tiến Sử, MD, PhD, MBA",
    authorBio: row.author_bio ?? "",
    blocks: row.blocks ?? [],
    related,
  };
}

export async function getNavItemsFromDb(): Promise<NavItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data: items, error } = await supabase
    .from("nav_items")
    .select("id, label, href, has_dropdown, sort_order")
    .order("sort_order");
  if (error || !items) return [];

  const { data: dropdowns } = await supabase
    .from("nav_dropdown_items")
    .select("nav_item_id, text, href, sort_order")
    .order("sort_order");

  return items.map((item) => ({
    label: item.label,
    href: item.href,
    hasDropdown: item.has_dropdown,
    dropdownItems: (dropdowns ?? [])
      .filter((d) => d.nav_item_id === item.id)
      .map((d) => ({ text: d.text, href: d.href })),
  }));
}

export async function getSidebarPanelsFromDb(): Promise<SidebarPanel[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  let panels: Array<{
    id: string;
    title: string;
    see_all_href: string;
    category_slug?: string | null;
    sort_order: number;
  }> | null = null;

  const withSlug = await supabase
    .from("sidebar_panels")
    .select("id, title, see_all_href, category_slug, sort_order")
    .order("sort_order");
  if (!withSlug.error) {
    panels = withSlug.data;
  } else {
    const fallback = await supabase
      .from("sidebar_panels")
      .select("id, title, see_all_href, sort_order")
      .order("sort_order");
    if (fallback.error || !fallback.data) return [];
    panels = fallback.data.map((panel) => ({
      ...panel,
      category_slug: panel.see_all_href?.startsWith("/")
        ? panel.see_all_href.slice(1).split("/")[0] || null
        : null,
    }));
  }
  if (!panels?.length) return [];

  return Promise.all(
    panels.map(async (panel) => {
      const slug =
        (panel.category_slug as string | null | undefined) ||
        (panel.see_all_href?.startsWith("/")
          ? panel.see_all_href.slice(1).split("/")[0] || null
          : null);
      if (!slug) {
        return {
          title: panel.title,
          seeAllHref: panel.see_all_href,
          items: [] as { text: string; href: string }[],
        };
      }

      const { data: rpcRows, error: rpcError } = await supabase.rpc(
        "random_category_articles",
        { p_slug: slug, p_limit: 15 },
      );

      let items: { text: string; href: string }[] = [];
      if (!rpcError && rpcRows) {
        items = (rpcRows as { path: string; title: string }[]).map((row) => ({
          text: row.title,
          href: normalizeArticleHref(row.path),
        }));
      } else {
        // Fallback if RPC missing: sample from category_articles client-side
        const { data: links } = await supabase
          .from("category_articles")
          .select("article_path")
          .eq("category_slug", slug)
          .limit(80);
        const paths = (links ?? []).map((l) => l.article_path as string);
        for (let i = paths.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [paths[i], paths[j]] = [paths[j], paths[i]];
        }
        const sample = paths.slice(0, 15);
        if (sample.length) {
          const { data: articles } = await supabase
            .from("articles")
            .select("path, title")
            .in("path", sample)
            .eq("is_published", true);
          const byPath = new Map(
            (articles ?? []).map((a) => [a.path as string, a.title as string]),
          );
          items = sample
            .map((path) => {
              const title = byPath.get(path);
              return title
                ? { text: title, href: normalizeArticleHref(path) }
                : null;
            })
            .filter(Boolean) as { text: string; href: string }[];
        }
      }

      return {
        title: panel.title,
        seeAllHref: panel.see_all_href,
        items,
      };
    }),
  );
}

async function getLatestArticles(limit: number): Promise<Article[]> {
  const supabase = createDataClient();
  const withPublishedOn = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("published_on", { ascending: false, nullsFirst: false })
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!withPublishedOn.error) {
    return ((withPublishedOn.data as ArticleRow[] | null) ?? []).map((row) =>
      mapArticle(row),
    );
  }

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("day", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as ArticleRow[] | null) ?? []).map((row) => mapArticle(row));
}

export async function getLatestArticlesByCategory(
  categorySlug: string,
  limit: number,
): Promise<Article[]> {
  const supabase = createDataClient();

  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    "latest_category_articles",
    { p_slug: categorySlug, p_limit: limit },
  );
  if (!rpcError && rpcRows) {
    return ((rpcRows as ArticleRow[]) ?? []).map((row) => mapArticle(row));
  }

  const { data: links, error: linkError } = await supabase
    .from("category_articles")
    .select("article_path")
    .eq("category_slug", categorySlug);
  if (linkError) throw new Error(linkError.message);
  const paths = (links ?? []).map((l) => l.article_path as string);
  if (!paths.length) return [];

  const articles: ArticleRow[] = [];
  const chunkSize = 80;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { data: chunkArticles, error: chunkError } = await supabase
      .from("articles")
      .select("*")
      .in("path", chunk)
      .eq("is_published", true);
    if (chunkError) throw new Error(chunkError.message);
    articles.push(...((chunkArticles ?? []) as ArticleRow[]));
  }

  articles.sort((a, b) => {
    const key = (row: ArticleRow) =>
      `${row.year}${row.month}${row.day}${row.path}`;
    return key(b).localeCompare(key(a));
  });

  return articles.slice(0, limit).map((row) => mapArticle(row));
}

export async function getHomepageDataFromDb(): Promise<{
  featured: Article | null;
  secondary: Article[];
  sections: ArticleSection[];
} | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();

  const [latest, { data: sections, error: sectionsError }] = await Promise.all([
    getLatestArticles(4),
    supabase
      .from("homepage_sections")
      .select("id, title, see_more_href, sort_order")
      .order("sort_order"),
  ]);
  if (sectionsError) throw new Error(sectionsError.message);

  const featured = latest[0] ?? null;
  const secondary = latest.slice(1, 4);

  const mappedSections: ArticleSection[] = await Promise.all(
    (sections ?? []).map(async (section) => ({
      id: section.id,
      title: section.title,
      seeMoreHref: section.see_more_href,
      articles: await getLatestArticlesByCategory(section.id, 6),
    })),
  );

  return { featured, secondary, sections: mappedSections };
}

export async function getCategoryPageFromDb(slug: string): Promise<CategoryPageData | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!category) return null;

  const { data: links } = await supabase
    .from("category_articles")
    .select("article_path, sort_order, layout")
    .eq("category_slug", slug)
    .order("sort_order");

  const paths = (links ?? []).map((l) => l.article_path);
  let articles: ArticleRow[] = [];

  // Supabase/PostgREST giới hạn độ dài URL khi dùng `.in(...)` với mảng lớn.
  // Một số category (ví dụ `tin-khac`) có hàng trăm item, cần chunk để tránh HeadersOverflowError.
  if (paths.length) {
    const chunkSize = 80;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      const { data: chunkArticles, error: chunkError } = await supabase
        .from("articles")
        .select("*")
        .in("path", chunk);
      if (chunkError) throw new Error(chunkError.message);
      articles = [...articles, ...((chunkArticles ?? []) as ArticleRow[])];
    }
  }

  const articleByPath = new Map((articles ?? []).map((a) => [a.path, a]));
  const mapped = (links ?? [])
    .map((link) => {
      const row = articleByPath.get(link.article_path);
      return row ? mapArticle(row, link.layout) : null;
    })
    .filter(Boolean) as Article[];

  let parentTitle = "";
  if (category.parent_slug && category.kind === "subcategory") {
    const { data: parent } = await supabase
      .from("categories")
      .select("title")
      .eq("slug", category.parent_slug)
      .maybeSingle();
    parentTitle = (parent?.title as string | undefined) ?? category.parent_slug;
  }

  const breadcrumbs =
    category.parent_slug && category.kind === "subcategory"
      ? [
          { label: "Trang chủ", href: "/" },
          {
            label: parentTitle,
            href: `/${category.parent_slug}`,
          },
          { label: category.title },
        ]
      : [{ label: "Trang chủ", href: "/" }, { label: category.title }];

  return {
    title: category.title,
    breadcrumbs,
    articles: mapped,
    totalPages: category.total_pages,
    currentPage: 1,
  };
}

export async function getArticleDetailFromDb(
  year: string,
  month: string,
  day: string,
  slug: string,
): Promise<ArticleDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();
  const variants = articlePathVariants(year, month, day, slug);

  let row: ArticleRow | null = null;
  for (const path of variants) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("path", path)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      row = data as ArticleRow;
      break;
    }
  }
  if (!row) return null;

  const { data: relatedRows } = await supabase
    .from("articles")
    .select("*")
    .neq("path", row.path)
    .eq("is_published", true)
    .limit(3);

  return mapDetail(
    row,
    (relatedRows as ArticleRow[] | null)?.map((r) => mapArticle(r)) ?? [],
  );
}

export async function getAllArticleParamsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("articles")
    .select("year, month, day, slug")
    .eq("is_published", true);
  return (data ?? []).map((row) => ({
    year: row.year as string,
    month: row.month as string,
    day: row.day as string,
    // Prefer NFC so generated URLs match browser/Next normalization.
    slug: String(row.slug).normalize("NFC"),
  }));
}

export async function getGlossaryPageFromDb(
  tab: string,
): Promise<GlossaryPageData | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();

  const { data: category } = await supabase
    .from("categories")
    .select("slug")
    .eq("slug", tab)
    .eq("kind", "glossary")
    .maybeSingle();
  if (!category) return null;

  const { data: links } = await supabase
    .from("category_articles")
    .select("article_path, sort_order")
    .eq("category_slug", tab)
    .order("sort_order");

  const paths = (links ?? []).map((l) => l.article_path as string);
  let articles: Array<{ path: string; title: string; is_published: boolean }> =
    [];

  if (paths.length) {
    const chunkSize = 80;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      const { data: chunkArticles, error } = await supabase
        .from("articles")
        .select("path, title, is_published")
        .in("path", chunk)
        .eq("is_published", true);
      if (error) throw new Error(error.message);
      articles = [
        ...articles,
        ...((chunkArticles ?? []) as Array<{
          path: string;
          title: string;
          is_published: boolean;
        }>),
      ];
    }
  }

  const articleByPath = new Map(articles.map((a) => [a.path, a]));
  const ordered = (links ?? [])
    .map((link) => articleByPath.get(link.article_path as string))
    .filter(Boolean) as Array<{ path: string; title: string }>;

  const byLetter = new Map<string, { text: string; href: string }[]>();
  for (const article of ordered) {
    const letter = glossaryLetterFromTitle(article.title);
    const list = byLetter.get(letter) ?? [];
    list.push({ text: article.title, href: article.path });
    byLetter.set(letter, list);
  }

  const sections = [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([letter, items]) => ({
      letter,
      items: items.sort((x, y) => x.text.localeCompare(y.text, "vi")),
    }));

  return { activeTab: tab, sections };
}

const EXCERPT_MAX = 300;

function excerptFromBlocks(blocks: ArticleBlock[] | null | undefined): string {
  if (!blocks?.length) return "";
  for (const block of blocks) {
    if (block.type === "paragraph" && block.text?.trim()) {
      const text = block.text.trim();
      return text.length > EXCERPT_MAX
        ? `${text.slice(0, EXCERPT_MAX).trimEnd()}…`
        : text;
    }
  }
  return "";
}

function normalizeTooltipExcerpt(excerpt: string | null | undefined): string {
  const raw = (excerpt ?? "").trim();
  if (!raw) return "";
  return raw.length > EXCERPT_MAX
    ? `${raw.slice(0, EXCERPT_MAX).trimEnd()}…`
    : raw;
}

/** Glossary terms for article body highlight + tooltip (cached per request/build). */
export const getGlossaryTooltipTermsFromDb = cache(
  async (): Promise<GlossaryTooltipTerm[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = createDataClient();

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("slug")
      .eq("kind", "glossary");
    if (catError) throw new Error(catError.message);

    const slugs = (categories ?? []).map((c) => c.slug as string);
    if (!slugs.length) return [];

    const paths = new Set<string>();
    for (let i = 0; i < slugs.length; i += 80) {
      const chunk = slugs.slice(i, i + 80);
      const { data: links, error: linkError } = await supabase
        .from("category_articles")
        .select("article_path")
        .in("category_slug", chunk);
      if (linkError) throw new Error(linkError.message);
      for (const link of links ?? []) {
        if (link.article_path) paths.add(link.article_path as string);
      }
    }

    const pathList = [...paths];
    if (!pathList.length) return [];

    type TermRow = {
      path: string;
      title: string;
      excerpt: string | null;
      blocks: ArticleBlock[] | null;
      is_published: boolean;
    };

    const articles: TermRow[] = [];
    for (let i = 0; i < pathList.length; i += 80) {
      const chunk = pathList.slice(i, i + 80);
      const { data, error } = await supabase
        .from("articles")
        .select("path, title, excerpt, blocks, is_published")
        .in("path", chunk)
        .eq("is_published", true);
      if (error) throw new Error(error.message);
      articles.push(...((data ?? []) as TermRow[]));
    }

    const byKey = new Map<string, GlossaryTooltipTerm>();
    for (const row of articles) {
      const term = row.title?.trim();
      if (!term || !row.path) continue;
      const key = term.toLocaleLowerCase("vi");
      if (byKey.has(key)) continue;
      const excerpt =
        normalizeTooltipExcerpt(row.excerpt) ||
        excerptFromBlocks(row.blocks);
                  byKey.set(key, {
        term,
        href: normalizeArticleHref(row.path),
        excerpt,
      });
    }

    return [...byKey.values()].sort(
      (a, b) => b.term.length - a.term.length || a.term.localeCompare(b.term, "vi"),
    );
  },
);

export async function getAboutUsFromDb() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "about_us")
    .maybeSingle();
  return (data?.value as {
    title: string;
    paragraphs: string[];
    representative: string;
    members: string[];
    address: string;
  } | null) ?? null;
}

export async function getSubcategoryParamsFromDb(parentSlug: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, title")
    .eq("parent_slug", parentSlug)
    .eq("kind", "subcategory")
    .order("sort_order");

  return (data ?? []).map((row) => ({
    slug: row.slug.replace(`${parentSlug}/`, ""),
    title: row.title as string,
  }));
}

export async function getArchiveCategoryParamsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug")
    .eq("kind", "archive")
    .order("sort_order");
  return (data ?? []).map((row) => ({ slug: row.slug as string }));
}

export async function getGlossaryCategoryParamsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug")
    .eq("kind", "glossary")
    .order("sort_order");
  return (data ?? []).map((row) => ({ slug: row.slug as string }));
}

export async function getTopLevelCategoryParamsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, kind")
    .in("kind", ["archive", "glossary"])
    .order("sort_order");
  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    kind: row.kind as "archive" | "glossary",
  }));
}

export async function getCategoryKindFromDb(
  slug: string,
): Promise<"archive" | "glossary" | "subcategory" | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("kind")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.kind as "archive" | "glossary" | "subcategory" | undefined) ?? null;
}

export async function getAllSubcategoryParamsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, parent_slug")
    .eq("kind", "subcategory")
    .order("sort_order");

  return (data ?? [])
    .map((row) => {
      const parentSlug = row.parent_slug as string;
      const fullSlug = row.slug as string;
      if (!parentSlug || !fullSlug.startsWith(`${parentSlug}/`)) return null;
      return {
        parentSlug,
        slug: fullSlug.slice(parentSlug.length + 1),
      };
    })
    .filter(Boolean) as Array<{ parentSlug: string; slug: string }>;
}

export async function getGlossaryTabsFromDb() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("categories")
    .select("slug, title, sort_order")
    .eq("kind", "glossary")
    .order("sort_order");
  return (data ?? []).map((tab) => ({
    id: tab.slug as string,
    label: tab.title as string,
    href: `/${tab.slug}`,
  }));
}

export async function getLogoSrcFromDb() {
  if (!isSupabaseConfigured()) return null;
  const supabase = createDataClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "logo_src")
    .maybeSingle();
  return typeof data?.value === "string" ? data.value : null;
}

export type BrandingSettings = {
  logoSrc: string;
  faviconSrc: string;
  brandPrimary: string;
  brandLight: string;
  brandMuted: string;
  borderLight: string;
};

export const DEFAULT_BRANDING: BrandingSettings = {
  logoSrc:
    "https://iweejgtuyzdmdjdjmxiq.supabase.co/storage/v1/object/public/images/thegioithuocmoi/TGTM-Final-06-750x254.png",
  faviconSrc:
    "https://iweejgtuyzdmdjdjmxiq.supabase.co/storage/v1/object/public/images/thegioithuocmoi/TGTM-Final-tran-150x150.png",
  brandPrimary: "#b809b1",
  brandLight: "#faf5ff",
  brandMuted: "#f5f0fa",
  borderLight: "#ece4f3",
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getBrandingFromDb(): Promise<BrandingSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_BRANDING;
  const supabase = createDataClient();
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", [
      "logo_src",
      "favicon_src",
      "brand_primary",
      "brand_light",
      "brand_muted",
      "border_light",
    ]);

  const map = new Map((data ?? []).map((row) => [row.key, row.value]));

  return {
    logoSrc: asString(map.get("logo_src"), DEFAULT_BRANDING.logoSrc),
    faviconSrc: asString(map.get("favicon_src"), DEFAULT_BRANDING.faviconSrc),
    brandPrimary: asString(map.get("brand_primary"), DEFAULT_BRANDING.brandPrimary),
    brandLight: asString(map.get("brand_light"), DEFAULT_BRANDING.brandLight),
    brandMuted: asString(map.get("brand_muted"), DEFAULT_BRANDING.brandMuted),
    borderLight: asString(map.get("border_light"), DEFAULT_BRANDING.borderLight),
  };
}

function escapeIlikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchArticlesFromDb(
  query: string,
  options: { limit?: number } = {},
): Promise<Article[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const q = query.trim();
  const limit = options.limit ?? 50;

  let request = supabase
    .from("articles")
    .select(
      "path, title, category_label, date_label, read_time, image, excerpt, author, layout",
    )
    .eq("is_published", true)
    .order("date_label", { ascending: false })
    .limit(limit);

  if (q) {
    const pattern = `%${escapeIlikePattern(q)}%`;
    // Quote values so spaces/commas in the query don't break PostgREST `or`
    const quoted = `"${pattern.replace(/"/g, '\\"')}"`;
    request = request.or(
      `title.ilike.${quoted},category_label.ilike.${quoted},excerpt.ilike.${quoted}`,
    );
  }

  const { data } = await request;
  return ((data as ArticleRow[] | null) ?? []).map((row) => mapArticle(row));
}
