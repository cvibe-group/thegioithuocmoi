import Link from "next/link";
import { ArticleMeta, CategoryLabel } from "@/components/ArticleCard";
import type { Article } from "@/types/content";

/** Text-only card used in category archive grids (matches original). */
export function ArticleTextCard({ article }: { article: Article }) {
  return (
    <article className="mb-[30px]">
      <CategoryLabel>{article.category}</CategoryLabel>
      <Link href={article.href} className="group block">
        <h5 className="my-[1.8px] py-[5px] text-[18px] font-bold leading-[1.3] text-brand transition-opacity group-hover:opacity-80">
          {article.title}
        </h5>
      </Link>
      <ArticleMeta date={article.date} readTime={article.readTime} />
    </article>
  );
}
