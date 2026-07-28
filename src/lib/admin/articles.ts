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
  layout: "card" | "wide" | "featured" | null;
  blocks: ArticleBlock[];
  is_published: boolean;
  updated_at: string;
};

export type CategoryOption = {
  slug: string;
  title: string;
  kind: string;
};

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

export function buildArticlePath(
  year: string,
  month: string,
  day: string,
  slug: string,
) {
  return `/${year}/${month}/${day}/${slug}`;
}

export function categoryHrefFromSlug(slug: string) {
  return `/${slug}`;
}
