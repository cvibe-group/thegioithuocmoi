import type { ReactNode } from "react";

export const ADMIN_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const ADMIN_DEFAULT_PAGE_SIZE = 25;

export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

export function parseAdminPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function parseAdminPageSize(
  value: string | string[] | undefined,
): AdminPageSize {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (ADMIN_PAGE_SIZE_OPTIONS.includes(n as AdminPageSize)) {
    return n as AdminPageSize;
  }
  return ADMIN_DEFAULT_PAGE_SIZE;
}

export function paginationRange(page: number, pageSize: number, total: number) {
  if (total <= 0) {
    return {
      from: 0,
      to: 0,
      totalPages: 1,
      startIndex: 0,
      endIndex: 0,
      page: 1,
    };
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  return {
    from: startIndex + 1,
    to: endIndex,
    totalPages,
    startIndex,
    endIndex,
    page: safePage,
  };
}

/** Page numbers with ellipsis, e.g. [1, 2, 3, "…", 8] */
export type AdminPageItem = number | "…";

export function buildPageItems(
  current: number,
  totalPages: number,
  siblingCount = 1,
): AdminPageItem[] {
  if (totalPages <= 1) return [1];

  const totalNumbers = siblingCount * 2 + 5; // first + last + current + 2 siblings + 2 ellipsis
  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblingCount, 1);
  const rightSibling = Math.min(current + siblingCount, totalPages);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + siblingCount * 2;
    const left = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...left, "…", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + siblingCount * 2;
    const right = Array.from(
      { length: rightCount },
      (_, i) => totalPages - rightCount + 1 + i,
    );
    return [1, "…", ...right];
  }

  const middle = Array.from(
    { length: rightSibling - leftSibling + 1 },
    (_, i) => leftSibling + i,
  );
  return [1, "…", ...middle, "…", totalPages];
}

export type AdminTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};
