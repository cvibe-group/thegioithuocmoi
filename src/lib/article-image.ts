import { ARTICLE_PLACEHOLDER_IMAGE } from "@/data/constants";

export function resolveArticleImage(image?: string | null): string {
  const trimmed = image?.trim();
  return trimmed ? trimmed : ARTICLE_PLACEHOLDER_IMAGE;
}

export function isArticlePlaceholderImage(image?: string | null): boolean {
  return !image?.trim();
}
