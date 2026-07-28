import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import type { Article } from "@/types/content";

export function SearchResultsPage({
  query,
  results,
}: {
  query: string;
  results: Article[];
}) {
  const label = query.trim() || "…";

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

      {results.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-[#666666]">
          Không tìm thấy kết quả phù hợp.
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
