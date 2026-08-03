import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryArchivePage } from "@/components/CategoryArchivePage";
import { PageShell } from "@/components/PageShell";
import { getAllSubcategoryParamsFromDb, getCategoryPageFromDb } from "@/data/queries";
import { parseCategoryPage } from "@/lib/category-pagination";
import { buildPageMetadata } from "@/lib/seo";

interface PageProps {
  // Param tên "year"/"month" để khớp cây route bài viết /[year]/[month]/[day]/[slug].
  // URL thực tế vẫn là /<parentSlug>/<slug>.
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{ page?: string }>;
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
  return buildPageMetadata({
    title: data?.title ?? slug,
    path: `/${parentSlug}/${slug}`,
    description: data
      ? `Chuyên mục ${data.title} — Thế Giới Thuốc Mới`
      : undefined,
  });
}

export default async function DynamicSubcategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { year: parentSlug, month: slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = parseCategoryPage(pageRaw);
  const categorySlug = `${parentSlug}/${slug}`;
  const baseHref = `/${parentSlug}/${slug}`;

  const data = await getCategoryPageFromDb(categorySlug, { page });
  if (!data) notFound();

  if (page > data.totalPages) {
    redirect(
      data.totalPages > 1 ? `${baseHref}?page=${data.totalPages}` : baseHref,
    );
  }

  return (
    <PageShell>
      <CategoryArchivePage data={data} baseHref={baseHref} />
    </PageShell>
  );
}

