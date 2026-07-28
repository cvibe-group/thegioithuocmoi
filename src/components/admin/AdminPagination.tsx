"use client";

import {
  ADMIN_PAGE_SIZE_OPTIONS,
  buildPageItems,
  paginationRange,
  type AdminPageSize,
} from "@/lib/admin/pagination";

export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: AdminPageSize) => void;
}) {
  const { from, to, totalPages, page: safePage } = paginationRange(
    page,
    pageSize,
    total,
  );
  const pageItems = buildPageItems(safePage, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#666]">
      <p>
        {total === 0 ? "0 bản ghi" : `${from}–${to} / ${total} bản ghi`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2">
          <span>Mỗi trang</span>
          <select
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as AdminPageSize)
            }
            className="rounded border border-border-light px-2 py-1.5 outline-none focus:border-brand"
          >
            {ADMIN_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        {totalPages > 1 ? (
          <nav
            aria-label="Phân trang"
            className="flex flex-wrap items-center gap-1"
          >
            {pageItems.map((item, index) =>
              item === "…" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1.5 py-1.5 text-[#999]"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  aria-label={`Trang ${item}`}
                  aria-current={item === safePage ? "page" : undefined}
                  onClick={() => onPageChange(item)}
                  className={
                    item === safePage
                      ? "min-w-8 rounded border border-brand bg-brand px-2.5 py-1.5 font-semibold text-white"
                      : "min-w-8 rounded border border-border-light px-2.5 py-1.5 hover:bg-brand-light"
                  }
                >
                  {item}
                </button>
              ),
            )}
          </nav>
        ) : null}
      </div>
    </div>
  );
}
