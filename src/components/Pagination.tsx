import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseHref: string;
}

export function Pagination({ currentPage, totalPages, baseHref }: PaginationProps) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1">
      {pages.map((page, index) => {
        if (page === "…") {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-[14px] text-[#666666]">
              …
            </span>
          );
        }

        const isActive = page === currentPage;
        const href = page === 1 ? baseHref : `${baseHref}?page=${page}`;

        return (
          <Link
            key={page}
            href={href}
            className={cn(
              "flex size-9 items-center justify-center text-[14px] font-bold transition-colors",
              isActive
                ? "bg-brand text-white"
                : "text-brand hover:bg-brand-light",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </Link>
        );
      })}
      {currentPage < totalPages && (
        <Link
          href={`${baseHref}?page=${currentPage + 1}`}
          className="ml-2 px-3 py-2 text-[14px] font-bold text-brand transition-colors hover:opacity-80"
        >
          Next
        </Link>
      )}
    </nav>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [1];

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("…");
  pages.push(total);

  return pages;
}
