import { SidebarPanelsTable } from "@/components/admin/SidebarPanelsTable";
import { getAdminSidebarData } from "@/lib/admin/structure-queries";

export default async function AdminSidebarPage() {
  const { panels, categories } = await getAdminSidebarData();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Sidebar</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Mỗi panel gắn một category và hiển thị 15 bài ngẫu nhiên mỗi lần load.
      </p>
      <SidebarPanelsTable panels={panels} categories={categories} />
    </div>
  );
}
