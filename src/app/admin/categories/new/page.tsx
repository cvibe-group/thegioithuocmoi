import { CategoryForm } from "@/components/admin/CategoryForm";
import { listArchiveParents } from "@/lib/admin/category-queries";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminNewCategoryPage() {
  await requirePermission("categories");
  const createParents = await listArchiveParents();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Tạo category</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Tạo archive hoặc subcategory mới.
      </p>
      <CategoryForm mode="create" createParents={createParents} />
    </div>
  );
}
