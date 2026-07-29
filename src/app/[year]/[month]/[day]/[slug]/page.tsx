import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetailPage } from "@/components/ArticleDetailPage";
import { PageShell } from "@/components/PageShell";
import {
  getAllArticleParamsFromDb,
  getArticleDetailFromDb,
  getGlossaryTooltipTermsFromDb,
} from "@/data/queries";
import { decodeRouteParam } from "@/lib/unicode-path";

interface PageProps {
  params: Promise<{
    year: string;
    month: string;
    day: string;
    slug: string;
  }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month, day, slug } = decodeArticleParams(await params);
  const article = await getArticleDetailFromDb(year, month, day, slug);
  return {
    title: article
      ? `${article.title} - Thế Giới Thuốc Mới`
      : "Thế Giới Thuốc Mới",
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { year, month, day, slug } = decodeArticleParams(await params);

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    notFound();
  }

  const [article, glossaryTerms] = await Promise.all([
    getArticleDetailFromDb(year, month, day, slug),
    getGlossaryTooltipTermsFromDb(),
  ]);
  if (!article) notFound();

  return (
    <PageShell withSidebar={false} fullWidth>
      <ArticleDetailPage article={article} glossaryTerms={glossaryTerms} />
    </PageShell>
  );
}
