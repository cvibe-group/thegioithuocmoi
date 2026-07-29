export const CATEGORY_ARTICLES_PER_PAGE = 15;
export const CATEGORY_CARD_COUNT = 3;

export function parseCategoryPage(raw?: string): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function categoryTotalPages(articleCount: number): number {
  return Math.max(1, Math.ceil(articleCount / CATEGORY_ARTICLES_PER_PAGE));
}
