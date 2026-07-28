import { createAuthServerClient } from "@/lib/supabase/server";
import type { AdminArticle, CategoryOption } from "@/lib/admin/articles";
import type { ArticleBlock } from "@/types/content";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

const ARTICLE_SELECT =
  "id, path, slug, year, month, day, title, category_label, category_href, date_label, datetime_label, read_time, image, excerpt, author, author_bio, layout, blocks, is_published, updated_at";

export async function listAdminArticles(options?: {
  q?: string;
  status?: "all" | "published" | "draft";
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
    .select("slug, title, kind")
    .in("kind", ["archive", "subcategory", "glossary"])
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryOption[];
}
