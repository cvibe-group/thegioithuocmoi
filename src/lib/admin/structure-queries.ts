import { createAuthServerClient } from "@/lib/supabase/server";
import type { AdminCategory, CategoryArticleLink } from "@/lib/admin/category-queries";
import { listCategoryArticlesPaged } from "@/lib/admin/category-queries";
import { ADMIN_DEFAULT_PAGE_SIZE } from "@/lib/admin/pagination";

export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  has_dropdown: boolean;
  sort_order: number;
};

export type AdminNavDropdownItem = {
  id: string;
  nav_item_id: string;
  text: string;
  href: string;
  sort_order: number;
};

export type AdminSidebarPanel = {
  id: string;
  title: string;
  see_all_href: string;
  sort_order: number;
};

export type AdminSidebarItem = {
  id: string;
  panel_id: string;
  text: string;
  href: string;
  sort_order: number;
};

export type AdminHomepageSection = {
  id: string;
  title: string;
  see_more_href: string;
  sort_order: number;
};

export type AdminHomepageLink = {
  section_id: string;
  article_path: string;
  sort_order: number;
};

export type AdminGlossaryTab = {
  slug: string;
  title: string;
  sort_order: number;
  article_count: number;
};

export type ArticleOption = {
  path: string;
  title: string;
  category_label: string;
};

export async function getAdminNavData() {
  const supabase = await createAuthServerClient();
  const [{ data: items }, { data: dropdowns }] = await Promise.all([
    supabase.from("nav_items").select("*").order("sort_order"),
    supabase.from("nav_dropdown_items").select("*").order("sort_order"),
  ]);
  return {
    items: (items ?? []) as AdminNavItem[],
    dropdowns: (dropdowns ?? []) as AdminNavDropdownItem[],
  };
}

export async function getAdminSidebarData() {
  const supabase = await createAuthServerClient();
  const [{ data: panels }, { data: items }] = await Promise.all([
    supabase.from("sidebar_panels").select("*").order("sort_order"),
    supabase.from("sidebar_panel_items").select("*").order("sort_order"),
  ]);
  return {
    panels: (panels ?? []) as AdminSidebarPanel[],
    items: (items ?? []) as AdminSidebarItem[],
  };
}

export async function getAdminHomepageData() {
  const supabase = await createAuthServerClient();
  const [
    { data: settings },
    { data: sections },
    { data: links },
    { data: articles },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["featured_article_path", "secondary_news_paths"]),
    supabase.from("homepage_sections").select("*").order("sort_order"),
    supabase.from("homepage_section_articles").select("*").order("sort_order"),
    supabase
      .from("articles")
      .select("path, title, category_label")
      .eq("is_published", true)
      .order("date_label", { ascending: false }),
  ]);

  const map = new Map((settings ?? []).map((row) => [row.key, row.value]));
  return {
    featuredPath: (map.get("featured_article_path") as string) || "",
    secondaryPaths: (map.get("secondary_news_paths") as string[]) || [],
    sections: (sections ?? []) as AdminHomepageSection[],
    links: (links ?? []) as AdminHomepageLink[],
    articles: (articles ?? []) as ArticleOption[],
  };
}

export async function getAdminGlossaryData(
  tabId?: string,
  options?: { page?: number; pageSize?: number; q?: string },
) {
  const supabase = await createAuthServerClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("slug, title, sort_order")
    .eq("kind", "glossary")
    .order("sort_order");
  if (error) throw new Error(error.message);

  const list = (categories ?? []) as Array<{
    slug: string;
    title: string;
    sort_order: number;
  }>;

  const tabs: AdminGlossaryTab[] = await Promise.all(
    list.map(async (cat) => {
      const { count } = await supabase
        .from("category_articles")
        .select("*", { count: "exact", head: true })
        .eq("category_slug", cat.slug);
      return {
        slug: cat.slug,
        title: cat.title,
        sort_order: cat.sort_order,
        article_count: count ?? 0,
      };
    }),
  );

  const activeTab =
    (tabId && tabs.some((t) => t.slug === tabId) ? tabId : null) ||
    tabs[0]?.slug ||
    "";

  let links: CategoryArticleLink[] = [];
  let linksTotal = 0;
  const active = tabs.find((t) => t.slug === activeTab) ?? null;

  if (activeTab) {
    const paged = await listCategoryArticlesPaged(activeTab, {
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE,
      q: options?.q,
    });
    links = paged.items;
    linksTotal = paged.total;
  }

  return {
    tabs,
    activeTab,
    activeCategory: active
      ? ({
          slug: active.slug,
          title: active.title,
          kind: "glossary",
          parent_slug: null,
          total_pages: 1,
          sort_order: active.sort_order,
          article_count: active.article_count,
          subcategory_count: 0,
        } satisfies AdminCategory)
      : null,
    links,
    linksTotal,
  };
}

export async function getAboutUsSettings() {
  const supabase = await createAuthServerClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "about_us")
    .maybeSingle();

  const fallback = {
    title: "About Us",
    paragraphs: [] as string[],
    representative: "",
    members: [] as string[],
    address: "",
  };

  if (!data?.value || typeof data.value !== "object") return fallback;
  return { ...fallback, ...(data.value as typeof fallback) };
}
