import { SidebarPanelsTable } from "@/components/admin/SidebarPanelsTable";
import { getAdminSidebarData } from "@/lib/admin/structure-queries";

export default async function AdminSidebarPage() {
  const { panels } = await getAdminSidebarData();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Sidebar</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý panel. Sửa từng panel để quản lý link.
      </p>
      <SidebarPanelsTable panels={panels} />
    </div>
  );
}
