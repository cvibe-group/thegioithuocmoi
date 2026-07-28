import { Suspense } from "react";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import { listAdminArticles } from "@/lib/admin/article-queries";
import {
  parseAdminPage,
  parseAdminPageSize,
} from "@/lib/admin/pagination";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const pageSize = parseAdminPageSize(params.pageSize);
  const q = params.q ?? "";
  const statusRaw = params.status;
  const status =
    statusRaw === "published" || statusRaw === "draft" ? statusRaw : "all";

  const { items, total } = await listAdminArticles({
    page,
    pageSize,
    q,
    status,
  });

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Bài viết</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý nội dung: tạo, sửa, publish/ẩn, xóa.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <ArticlesTable articles={items} total={total} />
      </Suspense>
    </div>
  );
}
