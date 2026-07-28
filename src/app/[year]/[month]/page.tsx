import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryArchivePage } from "@/components/CategoryArchivePage";
import { PageShell } from "@/components/PageShell";
import { getAllSubcategoryParamsFromDb, getCategoryPageFromDb } from "@/data/queries";

interface PageProps {
  // Param tên "year"/"month" để khớp cây route bài viết /[year]/[month]/[day]/[slug].
  // URL thực tế vẫn là /<parentSlug>/<slug>.
  params: Promise<{ year: string; month: string }>;
}

export async function generateStaticParams() {
  const items = await getAllSubcategoryParamsFromDb();
  return items.map((item) => ({
    year: item.parentSlug,
    month: item.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year: parentSlug, month: slug } = await params;
  const data = await getCategoryPageFromDb(`${parentSlug}/${slug}`);
  return {
    title: data ? `${data.title} - Thế Giới Thuốc Mới` : "Thế Giới Thuốc Mới",
  };
}

export default async function DynamicSubcategoryPage({ params }: PageProps) {
  const { year: parentSlug, month: slug } = await params;
  const data = await getCategoryPageFromDb(`${parentSlug}/${slug}`);
  if (!data) notFound();

  return (
    <PageShell>
      <CategoryArchivePage data={data} baseHref={`/${parentSlug}/${slug}`} />
    </PageShell>
  );
}

