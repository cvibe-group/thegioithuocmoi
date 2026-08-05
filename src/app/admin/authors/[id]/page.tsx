import { notFound } from "next/navigation";
import { AuthorForm } from "@/components/admin/AuthorForm";
import { getAdminAuthorById } from "@/lib/admin/author-queries";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditAuthorPage({ params }: PageProps) {
  await requirePermission("authors");
  const { id } = await params;
  const author = await getAdminAuthorById(id);
  if (!author) notFound();
  return <AuthorForm mode="edit" initial={author} />;
}
