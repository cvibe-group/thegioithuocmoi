import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetailPage } from "@/components/ArticleDetailPage";
import { PageShell } from "@/components/PageShell";
import {
  getAllArticleParamsFromDb,
  getArticleDetailFromDb,
  getGlossaryTooltipTermsFromDb,
} from "@/data/queries";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildPageMetadata,
} from "@/lib/seo";
import { decodeRouteParam } from "@/lib/unicode-path";

interface PageProps {
  params: Promise<{
    year: string;
    month: string;
    day: string;
    slug: string;
  }>;
  searchParams: Promise<{ preview?: string }>;
}

function decodeArticleParams(raw: {
  year: string;
  month: string;
  day: string;
  slug: string;
}) {
  return {
    year: decodeRouteParam(raw.year),
    month: decodeRouteParam(raw.month),
    day: decodeRouteParam(raw.day),
    slug: decodeRouteParam(raw.slug),
  };
}

export async function generateStaticParams() {
  return getAllArticleParamsFromDb();
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { year, month, day, slug } = decodeArticleParams(await params);
  const { preview } = await searchParams;
  const article = await getArticleDetailFromDb(year, month, day, slug, {
    preview: preview === "1",
  });
  if (!article) {
    return { title: "Thế Giới Thuốc Mới" };
  }
  const path = `/${article.year}/${article.month}/${article.day}/${article.slug}`;
  return buildPageMetadata({
    title: article.title,
    description: article.excerpt,
    path,
    image: article.image,
    type: "article",
  });
}

export default async function ArticlePage({ params, searchParams }: PageProps) {
  const { year, month, day, slug } = decodeArticleParams(await params);
  const { preview } = await searchParams;

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    notFound();
  }

  const [article, glossaryTerms] = await Promise.all([
    getArticleDetailFromDb(year, month, day, slug, {
      preview: preview === "1",
    }),
    getGlossaryTooltipTermsFromDb(),
  ]);
  if (!article) notFound();

  const path = `/${article.year}/${article.month}/${article.day}/${article.slug}`;
  const jsonLd = [
    articleJsonLd({
      title: article.title,
      description: article.excerpt,
      path,
      image: article.image,
      datePublished: article.datetime,
      author: article.author,
    }),
    breadcrumbJsonLd([
      { name: "Trang chủ", path: "/" },
      { name: article.category, path: article.categoryHref },
      { name: article.title },
    ]),
  ];

  return (
    <PageShell withSidebar={false} fullWidth>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArticleDetailPage article={article} glossaryTerms={glossaryTerms} />
    </PageShell>
  );
}
