import { notFound } from "next/navigation";
import { ArticleForm } from "@/components/admin/ArticleForm";
import {
  getAdminArticleById,
  listCategoryOptions,
} from "@/lib/admin/article-queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditArticlePage({ params }: PageProps) {
  const { id } = await params;
  const [article, categories] = await Promise.all([
    getAdminArticleById(id),
    listCategoryOptions(),
  ]);

  if (!article) notFound();

  return <ArticleForm mode="edit" categories={categories} initial={article} />;
}
