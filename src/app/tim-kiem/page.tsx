import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SearchResultsPage } from "@/components/SearchResultsPage";
import { searchArticlesFromDb } from "@/data/queries";
import { buildPageMetadata } from "@/lib/seo";

type PageProps = {
  searchParams: Promise<{ q?: string; s?: string; page?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = (params.q ?? params.s ?? "").trim();
  return buildPageMetadata({
    title: q ? `Tìm kiếm: ${q}` : "Tìm kiếm",
    path: q ? `/tim-kiem?q=${encodeURIComponent(q)}` : "/tim-kiem",
    description: q
      ? `Kết quả tìm kiếm cho “${q}” trên Thế Giới Thuốc Mới`
      : "Tìm kiếm bài viết trên Thế Giới Thuốc Mới",
  });
}

export default async function TimKiemPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? params.s ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const result = query
    ? await searchArticlesFromDb(query, { limit: 20, page })
    : { items: [], total: 0, page: 1, pageSize: 20 };

  return (
    <PageShell>
      <SearchResultsPage
        query={query}
        results={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
      />
    </PageShell>
  );
}
