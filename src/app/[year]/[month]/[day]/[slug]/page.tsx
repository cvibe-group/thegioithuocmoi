import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetailPage } from "@/components/ArticleDetailPage";
import { PageShell } from "@/components/PageShell";
import {
  getAllArticleParamsFromDb,
  getArticleDetailFromDb,
} from "@/data/queries";

interface PageProps {
  params: Promise<{
    year: string;
    month: string;
    day: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return getAllArticleParamsFromDb();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month, day, slug } = await params;
  const article = await getArticleDetailFromDb(year, month, day, slug);
  return {
    title: article
      ? `${article.title} - Thế Giới Thuốc Mới`
      : "Thế Giới Thuốc Mới",
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { year, month, day, slug } = await params;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
    notFound();
  }

  const article = await getArticleDetailFromDb(year, month, day, slug);
  if (!article) notFound();

  return (
    <PageShell withSidebar={false} fullWidth>
      <ArticleDetailPage article={article} />
    </PageShell>
  );
}
