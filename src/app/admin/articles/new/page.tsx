import { ArticleForm } from "@/components/admin/ArticleForm";
import { listCategoryOptions } from "@/lib/admin/article-queries";
import { listAuthorOptions } from "@/lib/admin/author-queries";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminNewArticlePage() {
  await requirePermission("articles.write");
  const [categories, authors] = await Promise.all([
    listCategoryOptions(),
    listAuthorOptions(),
  ]);

  return (
    <ArticleForm mode="create" categories={categories} authors={authors} />
  );
}
