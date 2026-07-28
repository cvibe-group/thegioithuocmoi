import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClockIcon } from "@/components/icons";
import type { ArticleDetail } from "@/types/content";

interface ArticleDetailPageProps {
  article: ArticleDetail;
}

function highlightTerms(text: string): ReactNode[] {
  const terms = [
    "cholesterol",
    "FDA",
    "xơ vữa động mạch",
    "kháng thể đơn dòng",
    "nghiên cứu lâm sàng",
    "PCSK9",
    "LDL-C",
  ];
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);
  return parts.map((part, index) => {
    const isTerm = terms.some((t) => t.toLowerCase() === part.toLowerCase());
    if (isTerm) {
      return (
        <Link
          key={`${part}-${index}`}
          href="/thuat-ngu"
          className="font-bold text-brand hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ArticleDetailPage({ article }: ArticleDetailPageProps) {
  return (
    <div className="relative mx-auto max-w-[750px]">
      <ShareSidebar title={article.title} />

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
                {block.items?.map((item) => (
                  <li key={item} className="relative pl-4">
                    <span className="absolute left-0">•</span>
                    {highlightTerms(item)}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index}>{block.text ? highlightTerms(block.text) : null}</p>
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

function ShareSidebar({ title }: { title: string }) {
  const encoded = encodeURIComponent(title);
  const links = [
    { label: "Share on Facebook", href: "https://www.facebook.com/sharer.php?u=", color: "bg-[#3b5998]", mark: "f" },
    { label: "Share on Twitter", href: "https://twitter.com/share?url=", color: "bg-[#1da1f2]", mark: "𝕏" },
    { label: "Email to a Friend", href: `mailto:?subject=${encoded}&body=`, color: "bg-[#222222]", mark: "@" },
    { label: "Pin on Pinterest", href: "https://pinterest.com/pin/create/button/?url=", color: "bg-[#e60023]", mark: "P" },
    { label: "Share on LinkedIn", href: "https://www.linkedin.com/shareArticle?mini=true&url=", color: "bg-[#0a66c2]", mark: "in" },
  ];

  return (
    <aside className="pointer-events-none absolute top-24 -left-[52px] hidden flex-col gap-2 xl:flex">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className={`pointer-events-auto flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm ${link.color}`}
        >
          {link.mark}
        </a>
      ))}
    </aside>
  );
}
