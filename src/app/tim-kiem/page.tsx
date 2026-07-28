import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SearchResultsPage } from "@/components/SearchResultsPage";
import { searchArticlesFromDb } from "@/data/queries";

type PageProps = {
  searchParams: Promise<{ q?: string; s?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = (params.q ?? params.s ?? "").trim();
  return {
    title: q
      ? `${q} - Thế Giới Thuốc Mới`
      : "Tìm kiếm - Thế Giới Thuốc Mới",
  };
}

export default async function TimKiemPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = (params.q ?? params.s ?? "").trim();
  const results = query ? await searchArticlesFromDb(query, { limit: 50 }) : [];

  return (
    <PageShell>
      <SearchResultsPage query={query} results={results} />
    </PageShell>
  );
}
