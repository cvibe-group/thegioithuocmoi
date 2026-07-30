import { createAuthServerClient } from "@/lib/supabase/server";
import type { AdminArticle, CategoryOption } from "@/lib/admin/articles";
import type { ArticleBlock } from "@/types/content";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

const ARTICLE_SELECT =
  "id, path, slug, year, month, day, title, category_label, category_href, date_label, datetime_label, read_time, image, excerpt, author, author_bio, layout, blocks, is_published, updated_at";

export async function listAdminArticles(options?: {
  q?: string;
  status?: "all" | "published" | "draft";
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const supabase = await createAuthServerClient();

  let query = supabase
    .from("articles")
    .select(ARTICLE_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false });

  if (options?.status === "published") {
    query = query.eq("is_published", true);
  } else if (options?.status === "draft") {
    query = query.eq("is_published", false);
  }

  const category = options?.category?.trim();
  if (category && category !== "all") {
    query = query.eq("category_href", `/${category}`);
  }

  const q = options?.q?.trim();
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,category_label.ilike.%${q}%,slug.ilike.%${q}%`,
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    items: ((data ?? []) as AdminArticle[]).map((row) => ({
      ...row,
      blocks: (row.blocks ?? []) as ArticleBlock[],
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminArticleById(id: string) {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    ...(data as AdminArticle),
    blocks: ((data as AdminArticle).blocks ?? []) as ArticleBlock[],
  };
}

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, title, kind, parent_slug, sort_order")
    .in("kind", ["archive", "subcategory", "glossary"])
    .order("sort_order");

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<
    CategoryOption & { sort_order: number | null }
  >;
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const roots = rows
    .filter((row) => row.kind !== "subcategory")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const childrenByParent = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.kind !== "subcategory" || !row.parent_slug) continue;
    const list = childrenByParent.get(row.parent_slug) ?? [];
    list.push(row);
    childrenByParent.set(row.parent_slug, list);
  }

  const ordered: CategoryOption[] = [];
  for (const root of roots) {
    ordered.push({
      slug: root.slug,
      title: root.title,
      kind: root.kind,
      parent_slug: root.parent_slug,
    });
    const children = (childrenByParent.get(root.slug) ?? []).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    for (const child of children) {
      ordered.push({
        slug: child.slug,
        title: child.title,
        kind: child.kind,
        parent_slug: child.parent_slug,
      });
    }
  }

  // Orphan subcategories (missing parent row) — still selectable
  for (const row of rows) {
    if (row.kind !== "subcategory") continue;
    if (row.parent_slug && bySlug.has(row.parent_slug)) continue;
    ordered.push({
      slug: row.slug,
      title: row.title,
      kind: row.kind,
      parent_slug: row.parent_slug,
    });
  }

  return ordered;
}
