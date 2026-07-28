import { ArticleTextCard } from "@/components/ArticleTextCard";
import { ArticleWideCard } from "@/components/ArticleWideCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeaturedNews } from "@/components/FeaturedNews";
import { Pagination } from "@/components/Pagination";
import type { Article, CategoryPageData } from "@/types/content";

interface CategoryArchivePageProps {
  data: CategoryPageData;
  baseHref: string;
}

/**
 * Original pattern: featured (image+text) → row of 3 text-only → wide cards
 * with excerpt, interleaved with more text-only rows.
 */
function layoutArchiveArticles(articles: Article[]) {
  const [featured, ...rest] = articles;
  const textRows: Article[][] = [];
  const wideCards: Article[] = [];

  let buffer: Article[] = [];
  for (const article of rest) {
    if (article.layout === "wide") {
      if (buffer.length) {
        textRows.push(buffer);
        buffer = [];
      }
      wideCards.push(article);
    } else {
      buffer.push(article);
      if (buffer.length === 3) {
        textRows.push(buffer);
        buffer = [];
      }
    }
  }
  if (buffer.length) textRows.push(buffer);

  return { featured, textRows, wideCards };
}

export function CategoryArchivePage({ data, baseHref }: CategoryArchivePageProps) {
  const { featured, textRows, wideCards } = layoutArchiveArticles(data.articles);

  // Interleave: first text row, then first wide, then remaining text rows + wides
  const blocks: Array<{ type: "text"; items: Article[] } | { type: "wide"; item: Article }> = [];
  const textQueue = [...textRows];
  const wideQueue = [...wideCards];

  while (textQueue.length || wideQueue.length) {
    if (textQueue.length) {
      blocks.push({ type: "text", items: textQueue.shift()! });
    }
    if (wideQueue.length) {
      blocks.push({ type: "wide", item: wideQueue.shift()! });
    }
  }

  return (
    <div>
      <Breadcrumbs items={data.breadcrumbs} />
      <h1 className="mb-6 text-[28px] font-bold uppercase leading-tight text-[#0a0a0a]">
        {data.title}
      </h1>

      {featured && <FeaturedNews featured={featured} secondary={[]} />}

      {blocks.map((block, index) =>
        block.type === "text" ? (
          <div key={`text-${index}`} className="mb-2 grid gap-x-[30px] md:grid-cols-3">
            {block.items.map((article) => (
              <ArticleTextCard key={article.title} article={article} />
            ))}
          </div>
        ) : (
          <ArticleWideCard key={block.item.title} article={block.item} />
        ),
      )}

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
