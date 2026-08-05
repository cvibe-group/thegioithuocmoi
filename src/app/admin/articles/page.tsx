import { Suspense } from "react";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import {
  listAdminArticles,
  listCategoryOptions,
} from "@/lib/admin/article-queries";
import { hasPermission } from "@/lib/admin/auth";
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
    status?: string;
    category?: string;
  }>;
}

export default async function AdminArticlesPage({ searchParams }: PageProps) {
  const user = await requirePermission("articles.read");
  const canWrite = hasPermission(user, "articles.write");
  const params = await searchParams;
  const page = parseAdminPage(params.page);
  const pageSize = parseAdminPageSize(params.pageSize);
  const q = params.q ?? "";
  const statusRaw = params.status;
  const status =
    statusRaw === "published" || statusRaw === "draft" ? statusRaw : "all";
  const category = params.category?.trim() || "all";

  const [{ items, total }, categories] = await Promise.all([
    listAdminArticles({
      page,
      pageSize,
      q,
      status,
      category,
    }),
    listCategoryOptions(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Bài viết</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý nội dung: tạo, sửa, publish/ẩn, xóa.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <ArticlesTable
          articles={items}
          total={total}
          categories={categories}
          canWrite={canWrite}
        />
      </Suspense>
    </div>
  );
}
