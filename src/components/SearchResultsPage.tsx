import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Article } from "@/types/content";

export function SearchResultsPage({
  query,
  results,
  total = 0,
  page = 1,
  pageSize = 20,
}: {
  query: string;
  results: Article[];
  total?: number;
  page?: number;
  pageSize?: number;
}) {
  const label = query.trim() || "…";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Trang chủ", href: "/" },
          { label: `Results for ${label}` },
        ]}
      />

      <h1 className="mb-3 text-center text-[24px] font-bold text-[#0a0a0a]">
        Kết quả tìm kiếm &quot;{label}&quot;
      </h1>

      {total > 0 ? (
        <p className="mb-4 text-center text-[13px] text-[#666]">
          {total} kết quả · trang {page}/{totalPages}
        </p>
      ) : null}

      {results.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[#666666]">
          {query.trim()
            ? "Không tìm thấy kết quả phù hợp."
            : "Nhập từ khóa để tìm kiếm."}
        </p>
      ) : (
        <ul className="mx-auto max-w-[720px] space-y-3 pt-2">
          {results.map((article) => (
            <li key={article.href}>
              <Link
                href={article.href}
                className="block text-[18px] font-bold leading-[1.4] text-brand transition-opacity hover:opacity-80"
              >
                {article.title}
              </Link>
              {article.excerpt ? (
                <p className="mt-1 line-clamp-2 text-[13px] text-[#666]">
                  {article.excerpt}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && query.trim() ? (
        <nav className="mx-auto mt-8 flex max-w-[720px] flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              href={`/tim-kiem?q=${encodeURIComponent(query)}&page=${page - 1}`}
              className="rounded border border-border-light px-3 py-1.5 text-[13px] hover:border-brand hover:text-brand"
            >
              ← Trước
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/tim-kiem?q=${encodeURIComponent(query)}&page=${page + 1}`}
              className="rounded border border-border-light px-3 py-1.5 text-[13px] hover:border-brand hover:text-brand"
            >
              Sau →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
