import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryForm } from "@/components/admin/CategoryForm";
import {
  getAdminCategoryBySlug,
  listArchiveParents,
  listCategoryArticlesPaged,
  listSubcategoriesPaged,
} from "@/lib/admin/category-queries";
import {
  parseAdminPage,
  parseAdminPageSize,
} from "@/lib/admin/pagination";

interface PageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminCategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug: parts } = await params;
  const slug = parts.join("/");
  const sp = await searchParams;

  const category = await getAdminCategoryBySlug(slug);
  if (!category || category.kind === "glossary") notFound();

  const createParents = await listArchiveParents();

  const artPage = parseAdminPage(sp.artPage);
  const artPageSize = parseAdminPageSize(sp.artPageSize);
  const articlesResult = await listCategoryArticlesPaged(slug, {
    page: artPage,
    pageSize: artPageSize,
    q: sp.artQ,
  });

  let subcategories: Awaited<ReturnType<typeof listSubcategoriesPaged>> | null =
    null;
  if (category.kind === "archive") {
    subcategories = await listSubcategoriesPaged(slug, {
      page: parseAdminPage(sp.subPage),
      pageSize: parseAdminPageSize(sp.subPageSize),
    });
  }

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{category.title}</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Sửa category và quản lý bài viết gắn kèm.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <CategoryForm
          mode="edit"
          initial={category}
          createParents={createParents}
          subcategories={subcategories?.items}
          subTotal={subcategories?.total}
          articles={articlesResult.items}
          articlesTotal={articlesResult.total}
        />
      </Suspense>
    </div>
  );
}
