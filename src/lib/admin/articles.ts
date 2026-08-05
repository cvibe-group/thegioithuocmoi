import type { ArticleBlock } from "@/types/content";

export type AdminArticle = {
  id: string;
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
  author_image: string | null;
  /** Ordered author ids from article_authors */
  author_ids?: string[];
  layout: "card" | "wide" | "featured" | null;
  blocks: ArticleBlock[];
  content_html?: string | null;
  is_published: boolean;
  tags?: string[];
  created_at?: string | null;
  updated_at: string;
  created_by_id?: string | null;
  created_by_email?: string | null;
  updated_by_id?: string | null;
  updated_by_email?: string | null;
};

export type CategoryOption = {
  slug: string;
  title: string;
  kind: string;
  parent_slug: string | null;
};

export type CategoryOptionGroup = {
  root: CategoryOption;
  children: CategoryOption[];
};

/** Group archives/glossaries with their subcategories for select UIs. */
export function groupCategoryOptions(
  categories: CategoryOption[],
): CategoryOptionGroup[] {
  const childrenByParent = new Map<string, CategoryOption[]>();
  for (const category of categories) {
    if (category.kind !== "subcategory" || !category.parent_slug) continue;
    const list = childrenByParent.get(category.parent_slug) ?? [];
    list.push(category);
    childrenByParent.set(category.parent_slug, list);
  }

  return categories
    .filter((category) => category.kind !== "subcategory")
    .map((root) => ({
      root,
      children: childrenByParent.get(root.slug) ?? [],
    }));
}

export function categoryOptionLabel(category: CategoryOption, parentTitle?: string) {
  if (category.kind === "glossary") return `[Glossary] ${category.title}`;
  if (category.kind === "subcategory") {
    return parentTitle
      ? `${parentTitle} › ${category.title}`
      : `— ${category.title}`;
  }
  return category.title;
}

export const DEFAULT_AUTHOR = "Nguyễn Tiến Sử, MD, PhD, MBA";
export const DEFAULT_AUTHOR_BIO =
  "Tốt nghiệp Bác Sĩ Đa Khoa (MD), tại Đại Học Y Dược TP. HCM, VIETNAM (1995). Tốt nghiệp Tiến Sĩ Y Khoa (PhD), ngành Y Học Ứng Dụng Gene, tại Tokyo Medical and Dental University, JAPAN (2007). Tốt nghiệp Thạc Sĩ Quản Trị Kinh Doanh (MBA), tại University of Queensland, AUSTRALIA (2012). Hiện đang công tác trong lĩnh vực nghiên cứu và phát triển thuốc mới.";


export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function pad2(value: number | string) {
  return String(value).padStart(2, "0");
}

export function todayParts(date = new Date()) {
  return {
    year: String(date.getFullYear()),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
  };
}

export function toDateLabel(year: string, month: string, day: string) {
  return `${day}.${month}.${year}`;
}

export function toDatetimeLabel(year: string, month: string, day: string) {
  return `${toDateLabel(year, month, day)} 12:21 chiều`;
}

/** ISO date (YYYY-MM-DD) for articles.published_on, or null if invalid. */
export function toPublishedOn(year: string, month: string, day: string): string | null {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month) || !/^\d{1,2}$/.test(day)) {
    return null;
  }
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return `${year}-${pad2(m)}-${pad2(d)}`;
}

/** Format timestamptz for admin history UI. */
export function formatAdminDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildArticlePath(
  year: string,
  month: string,
  day: string,
  slug: string,
) {
  return `/${year}/${month}/${day}/${slug}`.normalize("NFC");
}

export function categoryHrefFromSlug(slug: string) {
  return `/${slug}`;
}
