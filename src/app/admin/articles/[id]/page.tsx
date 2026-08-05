import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import {
  getAdminArticleById,
  listCategoryOptions,
} from "@/lib/admin/article-queries";
import { listAuthorOptions } from "@/lib/admin/author-queries";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditArticlePage({ params }: PageProps) {
  await requirePermission("articles.write");
  const { id } = await params;
  const [article, categories, authors] = await Promise.all([
    getAdminArticleById(id),
    listCategoryOptions(),
    listAuthorOptions(),
  ]);

  if (!article) notFound();

  return (
    <ArticleForm
      mode="edit"
      categories={categories}
      authors={authors}
      initial={article}
    />
  );
}
