import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/types/content";

export function CategoryLabel({ children }: { children: string }) {
  return (
    <p className="mb-[1.4px] text-[14px] font-bold uppercase leading-[1.2] tracking-[0.7px] text-black opacity-70">
      {children}
    </p>
  );
}

export function ArticleMeta({ date, readTime }: { date: string; readTime?: string }) {
  return (
    <p className="text-[14.4px] leading-[1.6] text-[#0a0a0a]">
      {date}
      {readTime && (
        <>
          <span className="mx-1.5">|</span>
          {readTime}
        </>
      )}
    </p>
  );
}

/** Vertical card used in Thuốc / Vaccine / etc. grids */
export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="mb-[30px]">
      {article.image && (
        <Link href={article.href} className="relative mb-2 block aspect-[250/141] w-full overflow-hidden bg-[#f5f0fa]">
          <Image
            src={article.image}
            alt=""
            fill
            className="object-cover transition-opacity hover:opacity-90"
            sizes="(max-width: 768px) 100vw, 250px"
          />
        </Link>
      )}
      <CategoryLabel>{article.category}</CategoryLabel>
      <Link href={article.href} className="group block">
        <h5 className="my-[1.8px] py-[5px] text-[18px] font-bold leading-[1.3] text-brand transition-opacity group-hover:opacity-80">
          {article.title}
        </h5>
      </Link>
      <ArticleMeta date={article.date} />
    </article>
  );
}
