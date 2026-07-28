"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  parseAdminPage,
  parseAdminPageSize,
  type AdminPageSize,
} from "@/lib/admin/pagination";

export function useAdminPagination(options?: {
  defaultPageSize?: AdminPageSize;
  /** Extra keys preserved when updating page params */
  preserveKeys?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultPageSize = options?.defaultPageSize ?? ADMIN_DEFAULT_PAGE_SIZE;

  const page = parseAdminPage(searchParams.get("page") ?? undefined);
  const pageSize = parseAdminPageSize(
    searchParams.get("pageSize") ?? String(defaultPageSize),
  );

  const setParams = useCallback(
    (patch: Record<string, string | null | undefined>, resetPage = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (resetPage) {
        next.set("page", "1");
      }
      if (!next.get("pageSize")) {
        next.set("pageSize", String(pageSize));
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams, pageSize],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      setParams({ page: String(Math.max(1, nextPage)) });
    },
    [setParams],
  );

  const setPageSize = useCallback(
    (nextSize: AdminPageSize) => {
      setParams({ pageSize: String(nextSize), page: "1" });
    },
    [setParams],
  );

  const setFilter = useCallback(
    (key: string, value: string | null | undefined) => {
      setParams({ [key]: value }, true);
    },
    [setParams],
  );

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  return useMemo(
    () => ({
      page,
      pageSize,
      q,
      status,
      setPage,
      setPageSize,
      setFilter,
      setParams,
      searchParams,
    }),
    [page, pageSize, q, status, setPage, setPageSize, setFilter, setParams, searchParams],
  );
}
