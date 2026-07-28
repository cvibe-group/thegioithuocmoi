import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import type { ArticleSection } from "@/types/content";

interface ArticleSectionBlockProps {
  section: ArticleSection;
}

export function ArticleSectionBlock({ section }: ArticleSectionBlockProps) {
  return (
    <section className="mb-8" id={section.id}>
      <h2 className="mb-4 flex items-center justify-between gap-3 text-[32px] font-bold leading-[1.3]">
        <span className="text-brand">{section.title}</span>
        <Link
          href={section.seeMoreHref}
          className="shrink-0 text-[15px] font-normal text-brand transition-opacity hover:opacity-80"
        >
          Xem thêm
        </Link>
      </h2>

      <div className="grid gap-x-[30px] sm:grid-cols-2 lg:grid-cols-3">
        {section.articles.map((article) => (
          <ArticleCard key={`${section.id}-${article.title}`} article={article} />
        ))}
      </div>
    </section>
  );
}
