import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CategoryArchivePage } from "@/components/CategoryArchivePage";
import { GlossaryIndexPage } from "@/components/GlossaryIndexPage";
import { PageShell } from "@/components/PageShell";
import {
  getCategoryKindFromDb,
  getCategoryPageFromDb,
  getGlossaryPageFromDb,
  getGlossaryTabsFromDb,
  getTopLevelCategoryParamsFromDb,
} from "@/data/queries";
import { parseCategoryPage } from "@/lib/category-pagination";

interface PageProps {
  params: Promise<{ year: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateStaticParams() {
  // Param tên "year" để khớp cây route bài viết /[year]/[month]/[day]/[slug].
  const items = await getTopLevelCategoryParamsFromDb();
  return items.map((item) => ({ year: item.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { year } = await params;
  if (/^\d{4}$/.test(year)) {
    return { title: "Thế Giới Thuốc Mới" };
  }

  const kind = await getCategoryKindFromDb(year);
  if (kind === "glossary") {
    const tabs = await getGlossaryTabsFromDb();
    const tab = tabs.find((t) => t.id === year);
    return {
      title: tab
        ? `${tab.label} - Thế Giới Thuốc Mới`
        : "Thế Giới Thuốc Mới",
    };
  }

  const data = await getCategoryPageFromDb(year);
  return {
    title: data ? `${data.title} - Thế Giới Thuốc Mới` : "Thế Giới Thuốc Mới",
  };
}

export default async function DynamicTopLevelCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const { year } = await params;
  const { page: pageRaw } = await searchParams;
  const page = parseCategoryPage(pageRaw);
  // Tránh /2024 bị hiểu nhầm thành archive khi không có category.
  if (/^\d{4}$/.test(year)) notFound();

  const kind = await getCategoryKindFromDb(year);

  if (kind === "glossary") {
    const [data, tabs] = await Promise.all([
      getGlossaryPageFromDb(year),
      getGlossaryTabsFromDb(),
    ]);
    if (!data) notFound();
    return (
      <PageShell withSidebar={false} fullWidth>
        <GlossaryIndexPage data={data} tabs={tabs} />
      </PageShell>
    );
  }

  if (kind !== "archive") notFound();

  const data = await getCategoryPageFromDb(year, { page });
  if (!data) notFound();

  if (page > data.totalPages) {
    redirect(
      data.totalPages > 1 ? `/${year}?page=${data.totalPages}` : `/${year}`,
    );
  }

  return (
    <PageShell>
      <CategoryArchivePage data={data} baseHref={`/${year}`} />
    </PageShell>
  );
}
