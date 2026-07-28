import { MenuItemsTable } from "@/components/admin/MenuItemsTable";
import { getAdminNavData } from "@/lib/admin/structure-queries";

export default async function AdminMenuPage() {
  const { items } = await getAdminNavData();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Menu</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý navigation. Sửa từng mục để quản lý dropdown.
      </p>
      <MenuItemsTable items={items} />
    </div>
  );
}
