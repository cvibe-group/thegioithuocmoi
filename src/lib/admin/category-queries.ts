import { createAuthServerClient } from "@/lib/supabase/server";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export type AdminCategory = {
  slug: string;
  title: string;
  kind: "archive" | "subcategory" | "glossary";
  parent_slug: string | null;
  parent_title: string | null;
  total_pages: number;
  sort_order: number;
  article_count: number;
  subcategory_count: number;
};

export type CategoryArticleLink = {
  article_path: string;
  sort_order: number;
  layout: "card" | "wide" | "featured" | null;
  title: string;
  is_published: boolean;
  category_label: string;
};

const CATEGORY_KINDS = ["archive", "subcategory"] as const;

async function enrichCategory(
  supabase: Awaited<ReturnType<typeof createAuthServerClient>>,
  cat: {
    slug: string;
    title: string;
    kind: AdminCategory["kind"];
    parent_slug: string | null;
    total_pages: number;
    sort_order: number;
  },
  parentTitleBySlug?: Map<string, string>,
): Promise<AdminCategory> {
  const { count: articleCount } = await supabase
    .from("category_articles")
    .select("*", { count: "exact", head: true })
    .eq("category_slug", cat.slug);

  const { count: subcategoryCount } =
    cat.kind === "archive"
      ? await supabase
          .from("categories")
          .select("*", { count: "exact", head: true })
          .eq("parent_slug", cat.slug)
          .eq("kind", "subcategory")
      : { count: 0 as number | null };

  const parent_title =
    cat.parent_slug != null
      ? (parentTitleBySlug?.get(cat.parent_slug) ?? cat.parent_slug)
      : null;

  return {
    ...cat,
    parent_title,
    article_count: articleCount ?? 0,
    subcategory_count: subcategoryCount ?? 0,
  };
}

async function loadParentTitleMap(
  supabase: Awaited<ReturnType<typeof createAuthServerClient>>,
  parentSlugs: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(parentSlugs.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase
    .from("categories")
    .select("slug, title")
    .in("slug", unique);
  if (error) throw new Error(error.message);

  return new Map(
    ((data ?? []) as Array<{ slug: string; title: string }>).map((row) => [
      row.slug,
      row.title,
    ]),
  );
}

export async function listAdminCategories() {
  const supabase = await createAuthServerClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug, title, kind, parent_slug, total_pages, sort_order")
    .in("kind", CATEGORY_KINDS)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  const list = (categories ?? []) as Array<{
    slug: string;
    title: string;
    kind: "archive" | "subcategory";
    parent_slug: string | null;
    total_pages: number;
    sort_order: number;
  }>;

  const parentTitles = await loadParentTitleMap(
    supabase,
    list.map((cat) => cat.parent_slug).filter((slug): slug is string => Boolean(slug)),
  );

  const enriched = await Promise.all(
    list.map((cat) => enrichCategory(supabase, cat, parentTitles)),
  );

  const createParents = enriched
    .filter((c) => c.kind === "archive")
    .map((c) => ({ slug: c.slug, title: c.title }));

  return { categories: enriched, createParents };
}

export async function listAdminCategoriesPaged(options?: {
  q?: string;
  kind?: "all" | "archive" | "subcategory";
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const supabase = await createAuthServerClient();

  let query = supabase
    .from("categories")
    .select("slug, title, kind, parent_slug, total_pages, sort_order", {
      count: "exact",
    })
    .in("kind", CATEGORY_KINDS)
    .order("sort_order", { ascending: true });

  if (options?.kind === "archive" || options?.kind === "subcategory") {
    query = query.eq("kind", options.kind);
  }

  const q = options?.q?.trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    slug: string;
    title: string;
    kind: "archive" | "subcategory";
    parent_slug: string | null;
    total_pages: number;
    sort_order: number;
  }>;

  const parentTitles = await loadParentTitleMap(
    supabase,
    rows
      .map((cat) => cat.parent_slug)
      .filter((slug): slug is string => Boolean(slug)),
  );

  const items = await Promise.all(
    rows.map((cat) => enrichCategory(supabase, cat, parentTitles)),
  );

  return { items, total: count ?? 0, page, pageSize };
}

export async function listArchiveParents() {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, title")
    .eq("kind", "archive")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ slug: string; title: string }>;
}

export async function getAdminCategoryBySlug(
  slug: string,
): Promise<AdminCategory | null> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, title, kind, parent_slug, total_pages, sort_order")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as {
    slug: string;
    title: string;
    kind: AdminCategory["kind"];
    parent_slug: string | null;
    total_pages: number;
    sort_order: number;
  };
  const parentTitles = await loadParentTitleMap(
    supabase,
    row.parent_slug ? [row.parent_slug] : [],
  );
  return enrichCategory(supabase, row, parentTitles);
}

export async function listSubcategoriesPaged(
  parentSlug: string,
  options?: { page?: number; pageSize?: number; q?: string },
) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const supabase = await createAuthServerClient();

  let query = supabase
    .from("categories")
    .select("slug, title, kind, parent_slug, total_pages, sort_order", {
      count: "exact",
    })
    .eq("parent_slug", parentSlug)
    .eq("kind", "subcategory")
    .order("sort_order", { ascending: true });

  const q = options?.q?.trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);

  const parentTitles = await loadParentTitleMap(supabase, [parentSlug]);

  const items = await Promise.all(
    ((data ?? []) as Array<{
      slug: string;
      title: string;
      kind: "subcategory";
      parent_slug: string | null;
      total_pages: number;
      sort_order: number;
    }>).map((cat) => enrichCategory(supabase, cat, parentTitles)),
  );

  return { items, total: count ?? 0, page, pageSize };
}

export async function listCategoryArticles(
  categorySlug: string,
): Promise<CategoryArticleLink[]> {
  const result = await listCategoryArticlesPaged(categorySlug, {
    page: 1,
    pageSize: 10_000,
  });
  return result.items;
}

export async function listCategoryArticlesPaged(
  categorySlug: string,
  options?: { page?: number; pageSize?: number; q?: string },
) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const supabase = await createAuthServerClient();
  const q = options?.q?.trim();

  if (q) {
    // Search articles first, then intersect with category links
    const { data: matchedArticles, error: searchError } = await supabase
      .from("articles")
      .select("path, title, is_published, category_label")
      .or(`title.ilike.%${q}%,slug.ilike.%${q}%,path.ilike.%${q}%`)
      .limit(500);
    if (searchError) throw new Error(searchError.message);

    const paths = (matchedArticles ?? []).map((a) => a.path as string);
    if (!paths.length) {
      return { items: [] as CategoryArticleLink[], total: 0, page, pageSize };
    }

    const { data: links, error, count } = await supabase
      .from("category_articles")
      .select("article_path, sort_order, layout", { count: "exact" })
      .eq("category_slug", categorySlug)
      .in("article_path", paths)
      .order("sort_order", { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (error) throw new Error(error.message);

    const byPath = new Map(
      (matchedArticles ?? []).map((row) => [row.path as string, row]),
    );
    const items = (links ?? []).map((link) => {
      const article = byPath.get(link.article_path as string);
      return {
        article_path: link.article_path as string,
        sort_order: link.sort_order as number,
        layout: (link.layout as CategoryArticleLink["layout"]) ?? null,
        title: (article?.title as string) ?? (link.article_path as string),
        is_published: (article?.is_published as boolean) ?? false,
        category_label: (article?.category_label as string) ?? "",
      };
    });
    return { items, total: count ?? 0, page, pageSize };
  }

  const from = (page - 1) * pageSize;
  const { data: links, error, count } = await supabase
    .from("category_articles")
    .select("article_path, sort_order, layout", { count: "exact" })
    .eq("category_slug", categorySlug)
    .order("sort_order", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw new Error(error.message);
  if (!links?.length) {
    return { items: [] as CategoryArticleLink[], total: count ?? 0, page, pageSize };
  }

  const paths = links.map((link) => link.article_path as string);
  const { data: articles, error: articleError } = await supabase
    .from("articles")
    .select("path, title, is_published, category_label")
    .in("path", paths);
  if (articleError) throw new Error(articleError.message);

  const byPath = new Map(
    (articles ?? []).map((row) => [row.path as string, row]),
  );

  const items = links.map((link) => {
    const article = byPath.get(link.article_path as string);
    return {
      article_path: link.article_path as string,
      sort_order: link.sort_order as number,
      layout: (link.layout as CategoryArticleLink["layout"]) ?? null,
      title: (article?.title as string) ?? (link.article_path as string),
      is_published: (article?.is_published as boolean) ?? false,
      category_label: (article?.category_label as string) ?? "",
    };
  });

  return { items, total: count ?? 0, page, pageSize };
}
