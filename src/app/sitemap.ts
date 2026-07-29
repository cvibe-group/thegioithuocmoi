import type { MetadataRoute } from "next";
import {
  getAllSubcategoryParamsFromDb,
  getArchiveCategoryParamsFromDb,
  getGlossaryCategoryParamsFromDb,
} from "@/data/queries";
import { absoluteUrl } from "@/lib/site-url";
import { normalizeArticleHref } from "@/lib/unicode-path";
import { createDataClient, isSupabaseConfigured } from "@/lib/supabase/data";

export const revalidate = 3600;

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/about-us", changeFrequency: "monthly", priority: 0.6 },
  { path: "/benh-hoc", changeFrequency: "weekly", priority: 0.8 },
  { path: "/thuat-ngu", changeFrequency: "weekly", priority: 0.8 },
  { path: "/xet-nghiem-chi-so", changeFrequency: "weekly", priority: 0.8 },
];

async function getPublishedArticlesForSitemap(): Promise<
  Array<{ path: string; lastModified: Date }>
> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createDataClient();
  const { data } = await supabase
    .from("articles")
    .select("year, month, day, slug, updated_at, published_on")
    .eq("is_published", true);

  return (data ?? []).map((row) => {
    const path = normalizeArticleHref(
      `/${row.year}/${row.month}/${row.day}/${String(row.slug).normalize("NFC")}`,
    );
    const lastModified = row.updated_at
      ? new Date(row.updated_at as string)
      : row.published_on
        ? new Date(row.published_on as string)
        : new Date();
    return { path, lastModified };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [articles, archives, glossaries, subcategories] = await Promise.all([
    getPublishedArticlesForSitemap(),
    getArchiveCategoryParamsFromDb(),
    getGlossaryCategoryParamsFromDb(),
    getAllSubcategoryParamsFromDb(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((item) => ({
    url: absoluteUrl(item.path),
    lastModified: now,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = [
    ...archives.map((c) => ({
      url: absoluteUrl(`/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...glossaries.map((c) => ({
      url: absoluteUrl(`/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...subcategories.map((c) => ({
      url: absoluteUrl(`/${c.parentSlug}/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  const articleSitemap: MetadataRoute.Sitemap = articles.map((a) => ({
    url: absoluteUrl(a.path),
    lastModified: a.lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Deduplicate by URL (static glossary pages may overlap category slugs)
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  for (const entry of [...staticEntries, ...categoryEntries, ...articleSitemap]) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    entries.push(entry);
  }

  return entries;
}
