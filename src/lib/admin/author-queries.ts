import { createAuthServerClient } from "@/lib/supabase/server";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export type AdminAuthor = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  image: string | null;
  sort_order: number;
  article_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuthorOption = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  image: string | null;
};

const AUTHOR_SELECT =
  "id, name, slug, bio, image, sort_order, created_at, updated_at";

export async function listAdminAuthorsPaged(options?: {
  page?: number;
  pageSize?: number;
  q?: string;
}) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE;
  const supabase = await createAuthServerClient();

  let query = supabase
    .from("authors")
    .select(AUTHOR_SELECT, { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const q = options?.q?.trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Omit<AdminAuthor, "article_count">>;
  const ids = rows.map((row) => row.id);
  const countByAuthor = new Map<string, number>();

  if (ids.length > 0) {
    const { data: links, error: linkError } = await supabase
      .from("article_authors")
      .select("author_id")
      .in("author_id", ids);
    if (linkError) throw new Error(linkError.message);
    for (const link of links ?? []) {
      const authorId = link.author_id as string;
      countByAuthor.set(authorId, (countByAuthor.get(authorId) ?? 0) + 1);
    }
  }

  return {
    items: rows.map((row) => ({
      ...row,
      bio: row.bio ?? "",
      article_count: countByAuthor.get(row.id) ?? 0,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getAdminAuthorById(id: string): Promise<AdminAuthor | null> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("authors")
    .select(AUTHOR_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { count } = await supabase
    .from("article_authors")
    .select("*", { count: "exact", head: true })
    .eq("author_id", id);

  const row = data as Omit<AdminAuthor, "article_count">;
  return {
    ...row,
    bio: row.bio ?? "",
    article_count: count ?? 0,
  };
}

export async function listAuthorOptions(): Promise<AuthorOption[]> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("authors")
    .select("id, name, slug, bio, image")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as AuthorOption[]).map((row) => ({
    ...row,
    bio: row.bio ?? "",
  }));
}

export async function listArticleAuthorIds(articleId: string): Promise<string[]> {
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("article_authors")
    .select("author_id, sort_order")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.author_id as string);
}
