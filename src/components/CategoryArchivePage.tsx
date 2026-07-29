import { ArticleTextCard } from "@/components/ArticleTextCard";
import { ArticleWideCard } from "@/components/ArticleWideCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeaturedNews } from "@/components/FeaturedNews";
import { Pagination } from "@/components/Pagination";
import { CATEGORY_CARD_COUNT } from "@/lib/category-pagination";
import type { Article, CategoryPageData } from "@/types/content";

interface CategoryArchivePageProps {
  data: CategoryPageData;
  baseHref: string;
}

/** Fixed per-page layout: 1 featured → 3 text cards → remaining wide cards. */
function layoutCategoryPage(articles: Article[]) {
  return {
    featured: articles[0] ?? null,
    cards: articles.slice(1, 1 + CATEGORY_CARD_COUNT),
    wides: articles.slice(1 + CATEGORY_CARD_COUNT),
  };
}

export function CategoryArchivePage({ data, baseHref }: CategoryArchivePageProps) {
  const { featured, cards, wides } = layoutCategoryPage(data.articles);

  return (
    <div>
      <Breadcrumbs items={data.breadcrumbs} />
      <h1 className="mb-6 text-[28px] font-bold uppercase leading-tight text-[#0a0a0a]">
        {data.title}
      </h1>

      {featured && <FeaturedNews featured={featured} secondary={[]} />}

      {cards.length > 0 && (
        <div className="mb-2 grid gap-x-[30px] md:grid-cols-3">
          {cards.map((article) => (
            <ArticleTextCard key={article.href} article={article} />
          ))}
        </div>
      )}

      {wides.map((article) => (
        <ArticleWideCard key={article.href} article={article} />
      ))}

      {data.totalPages > 1 && (
        <Pagination
          currentPage={data.currentPage ?? 1}
          totalPages={data.totalPages}
          baseHref={baseHref}
        />
      )}
    </div>
  );
}
