import Image from "next/image";
import { ArticleCard } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClockIcon } from "@/components/icons";
import { ShareSidebar } from "@/components/ShareSidebar";
import { highlightGlossaryText } from "@/lib/glossary-highlight";
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

  return (
    <div className="relative mx-auto max-w-[750px]">
      <ShareSidebar title={article.title} path={articlePath} />

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

      {article.image && (
        <div className="relative mb-4 aspect-[16/10] w-full overflow-hidden bg-[#f5f0fa]">
          <Image
            src={article.image}
            alt=""
            fill
            className="object-cover"
            sizes="750px"
            priority
          />
        </div>
      )}

      <p className="mb-6 text-right text-[14px] text-[#666666]">{article.author}</p>

      <div className="space-y-4 text-[18px] leading-[1.6] text-[#0a0a0a]">
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
          return (
            <p key={index}>
              {block.text ? highlight(block.text, `p${index}`) : null}
            </p>
          );
        })}
      </div>

      <section className="mt-10 rounded bg-[rgba(184,9,177,0.06)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex size-[90px] shrink-0 items-center justify-center rounded-full bg-brand text-[28px] font-bold text-white">
            NS
          </div>
          <div>
            <h5 className="mb-2 text-[18px] font-bold text-brand">
              {article.author}
            </h5>
            <p className="text-[14px] leading-[1.6] text-[#0a0a0a]">
              {article.authorBio}
            </p>
          </div>
        </div>
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
