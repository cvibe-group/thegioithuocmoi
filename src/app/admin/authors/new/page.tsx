import { AuthorForm } from "@/components/admin/AuthorForm";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminNewAuthorPage() {
  await requirePermission("authors");
  return <AuthorForm mode="create" />;
}
