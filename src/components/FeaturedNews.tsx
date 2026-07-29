import Image from "next/image";
import Link from "next/link";
import { ArticleMeta, CategoryLabel } from "@/components/ArticleCard";
import {
  isArticlePlaceholderImage,
  resolveArticleImage,
} from "@/lib/article-image";
import type { Article } from "@/types/content";

interface FeaturedNewsProps {
  featured: Article;
  secondary: Article[];
}

export function FeaturedNews({ featured, secondary }: FeaturedNewsProps) {
  const featuredImage = resolveArticleImage(featured.image);
  const featuredIsPlaceholder = isArticlePlaceholderImage(featured.image);

  return (
    <section className="mb-2">
      {/* Featured: 50/50 image + text, table-like */}
      <div className="mb-[30px] flex flex-col md:flex-row">
        <Link
          href={featured.href}
          className="relative block aspect-[405/228] w-full shrink-0 overflow-hidden bg-[#f5f0fa] md:w-1/2"
        >
          <Image
            src={featuredImage}
            alt=""
            fill
            className={
              featuredIsPlaceholder
                ? "object-contain p-6"
                : "object-cover object-[center_20%]"
            }
            sizes="(max-width: 768px) 100vw, 405px"
            priority
          />
        </Link>
        <div className="flex w-full flex-col justify-center bg-[rgba(184,9,177,0.05)] px-[21.6px] pb-4 pt-[10px] md:w-1/2">
          <CategoryLabel>{featured.category}</CategoryLabel>
          <Link href={featured.href} className="group block">
            <h5 className="my-[1.8px] py-[5px] text-[18px] font-bold leading-[1.3] text-brand transition-opacity group-hover:opacity-80">
              {featured.title}
            </h5>
          </Link>
          <ArticleMeta date={featured.date} readTime={featured.readTime} />
        </div>
      </div>

      {/* Secondary: 3-col text-only (images hidden on original) */}
      {secondary.length > 0 && (
        <div className="mb-6 grid gap-x-[30px] md:grid-cols-3">
          {secondary.map((article) => (
          <article key={article.title} className="mb-[30px]">
            <CategoryLabel>{article.category}</CategoryLabel>
            <Link href={article.href} className="group block">
              <h5 className="my-[1.8px] py-[5px] text-[18px] font-bold leading-[1.3] text-brand transition-opacity group-hover:opacity-80">
                {article.title}
              </h5>
            </Link>
            <ArticleMeta date={article.date} readTime={article.readTime} />
          </article>
        ))}
        </div>
      )}
    </section>
  );
}
