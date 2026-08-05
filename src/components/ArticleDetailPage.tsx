import Image from "next/image";
import { ArticleBodyHtml } from "@/components/ArticleBodyHtml";
import { ArticleCard } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClockIcon } from "@/components/icons";
import { ShareSidebar } from "@/components/ShareSidebar";
import { highlightGlossaryText } from "@/lib/glossary-highlight";
import { sanitizeArticleHtml } from "@/lib/content/html-sanitize";
import {
  isArticlePlaceholderImage,
  resolveArticleImage,
} from "@/lib/article-image";
import { normalizeArticleHref } from "@/lib/unicode-path";
import type { ArticleDetail, GlossaryTooltipTerm } from "@/types/content";

interface ArticleDetailPageProps {
  article: ArticleDetail;
  glossaryTerms?: GlossaryTooltipTerm[];
}

export function ArticleDetailPage({
  article,
  glossaryTerms = [],
}: ArticleDetailPageProps) {
  const articlePath = normalizeArticleHref(
    `/${article.year}/${article.month}/${article.day}/${article.slug}`,
  );

  function highlight(text: string, keyPrefix: string) {
    return highlightGlossaryText(text, glossaryTerms, keyPrefix, articlePath);
  }

  const heroImage = resolveArticleImage(article.image);
  const heroIsPlaceholder = isArticlePlaceholderImage(article.image);
  const safeHtml = article.contentHtml?.trim()
    ? sanitizeArticleHtml(article.contentHtml)
    : "";

  return (
    <div className="relative mx-auto max-w-[750px]">
      <ShareSidebar title={article.title} path={articlePath} />

      {article.isPreview ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          Bản xem trước (draft) — chỉ admin thấy được với <code>?preview=1</code>.
        </div>
      ) : null}

      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: article.category, href: article.categoryHref },
        ]}
      />

      <p className="mb-2 text-[16px] font-bold uppercase leading-[1.05] tracking-[0.5px] text-brand">
        {article.category}
      </p>

      <h1 className="mb-[13.6px] text-[27.2px] font-bold leading-[1.3] text-[#0a0a0a]">
        {article.title}
      </h1>

      <p className="mb-5 flex items-center gap-1.5 text-[14px] text-[#666666]">
        <ClockIcon className="size-3.5" />
        {article.datetime}
      </p>

      {article.tags && article.tags.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-border-light bg-brand-light px-2 py-0.5 text-[12px] text-brand"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden bg-[#f5f0fa]">
        <Image
          src={heroImage}
          alt=""
          fill
          className={heroIsPlaceholder ? "object-contain p-8" : "object-cover"}
          sizes="750px"
          priority
        />
      </div>

      <p className="mb-6 text-right text-[14px] text-[#666666]">{article.author}</p>

      {safeHtml ? (
        <ArticleBodyHtml
          html={safeHtml}
          glossaryTerms={glossaryTerms}
          articlePath={articlePath}
        />
      ) : (
        <div className="article-body space-y-4 text-[18px] leading-[1.6] text-[#0a0a0a]">
          {article.blocks.map((block, index) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={index}
                  className="pt-2 text-[18px] font-bold uppercase leading-[1.4] text-[#0a0a0a]"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={index} className="list-none space-y-3 pl-0">
                  {block.items?.map((item, itemIndex) => (
                    <li key={`${index}-${itemIndex}`} className="relative pl-4">
                      <span className="absolute left-0">•</span>
                      {highlight(item, `l${index}-${itemIndex}`)}
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.type === "image" && block.src) {
              return (
                <figure key={index} className="my-6">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#f5f0fa]">
                    <Image
                      src={block.src}
                      alt={block.alt || ""}
                      fill
                      className="object-contain"
                      sizes="750px"
                      unoptimized
                    />
                  </div>
                  {block.alt ? (
                    <figcaption className="mt-2 text-center text-[13px] text-[#666]">
                      {block.alt}
                    </figcaption>
                  ) : null}
                </figure>
              );
            }
            return (
              <p key={index}>
                {block.text ? highlight(block.text, `p${index}`) : null}
              </p>
            );
          })}
        </div>
      )}

      <section className="mt-10 space-y-4">
        {(article.authors?.length
          ? article.authors
          : [
              {
                name: article.author,
                bio: article.authorBio,
                image: article.authorImage,
              },
            ]
        ).map((author) => {
          const initials = author.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("");
          return (
            <div
              key={`${author.name}-${author.bio.slice(0, 24)}`}
              className="rounded bg-[rgba(184,9,177,0.06)] p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {author.image ? (
                  <Image
                    src={author.image}
                    alt={author.name}
                    width={90}
                    height={90}
                    className="size-[90px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-[90px] shrink-0 items-center justify-center rounded-full bg-brand text-[28px] font-bold text-white">
                    {initials || "AU"}
                  </div>
                )}
                <div>
                  <h5 className="mb-2 text-[18px] font-bold text-brand">
                    {author.name}
                  </h5>
                  {author.bio ? (
                    <p className="text-[14px] leading-[1.6] text-[#0a0a0a]">
                      {author.bio}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {article.related.length > 0 && (
        <section className="mt-12">
          <div className="mb-5">
            <div className="mb-2 h-[3px] w-10 bg-brand" />
            <h3 className="text-[22px] font-bold text-[#0a0a0a]">Bài viết liên quan</h3>
          </div>
          <div className="grid gap-x-[30px] md:grid-cols-3">
            {article.related.map((related) => (
              <ArticleCard key={related.href} article={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
