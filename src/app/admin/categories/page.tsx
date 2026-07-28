import { Suspense } from "react";
import { CategoriesTable } from "@/components/admin/CategoriesTable";
import { listAdminCategoriesPaged } from "@/lib/admin/category-queries";
import {
  parseAdminPage,
  parseAdminPageSize,
} from "@/lib/admin/pagination";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    kind?: string;
  }>;
}

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const pageSize = parseAdminPageSize(params.pageSize);
  const kindRaw = params.kind;
  const kind =
    kindRaw === "archive" || kindRaw === "subcategory" ? kindRaw : "all";

  const { items, total } = await listAdminCategoriesPaged({
    page,
    pageSize,
    q: params.q,
    kind,
  });

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Danh mục</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý archive & subcategory. Chi tiết / gắn bài ở trang sửa.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <CategoriesTable categories={items} total={total} />
      </Suspense>
    </div>
  );
}
