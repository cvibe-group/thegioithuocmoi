import { ArticleForm } from "@/components/admin/ArticleForm";
import { listCategoryOptions } from "@/lib/admin/article-queries";

export default async function AdminNewArticlePage() {
  const categories = await listCategoryOptions();

  return <ArticleForm mode="create" categories={categories} />;
}
