import { Suspense } from "react";
import { AuthorsTable } from "@/components/admin/AuthorsTable";
import { listAdminAuthorsPaged } from "@/lib/admin/author-queries";
import {
  parseAdminPage,
  parseAdminPageSize,
} from "@/lib/admin/pagination";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
  }>;
}

export default async function AdminAuthorsPage({ searchParams }: PageProps) {
  await requirePermission("authors");
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const pageSize = parseAdminPageSize(params.pageSize);

  const { items, total } = await listAdminAuthorsPaged({
    page,
    pageSize,
    q: params.q,
  });

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Tác giả</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý hồ sơ tác giả. Gắn một hoặc nhiều tác giả khi sửa bài viết.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <AuthorsTable authors={items} total={total} />
      </Suspense>
    </div>
  );
}
