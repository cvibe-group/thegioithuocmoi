import Image from "next/image";
import Link from "next/link";
import { ArticleMeta, CategoryLabel } from "@/components/ArticleCard";
import type { Article } from "@/types/content";

export function ArticleWideCard({ article }: { article: Article }) {
  return (
    <article className="mb-[30px] flex flex-col md:flex-row">
      {article.image && (
        <Link
          href={article.href}
          className="relative block aspect-[405/228] w-full shrink-0 overflow-hidden md:w-1/2"
        >
          <Image
            src={article.image}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 405px"
          />
        </Link>
      )}
      <div className="flex w-full flex-col justify-center bg-[rgba(184,9,177,0.05)] px-[21.6px] pb-4 pt-[10px] md:w-1/2">
        <CategoryLabel>{article.category}</CategoryLabel>
        {article.author && (
          <p className="mb-1 text-[13px] text-[#666666]">{article.author}</p>
        )}
        <Link href={article.href} className="group block">
          <h5 className="my-[1.8px] py-[5px] text-[18px] font-bold leading-[1.3] text-brand transition-opacity group-hover:opacity-80">
            {article.title}
          </h5>
        </Link>
        {article.excerpt && (
          <p className="mb-2 line-clamp-3 text-[14px] leading-[1.6] text-[#666666]">
            {article.excerpt}
          </p>
        )}
        <ArticleMeta date={article.date} readTime={article.readTime} />
      </div>
    </article>
  );
}
