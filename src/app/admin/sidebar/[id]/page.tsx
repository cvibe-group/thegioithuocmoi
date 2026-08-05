import { notFound } from "next/navigation";
import { SidebarPanelDetail } from "@/components/admin/SidebarPanelDetail";
import { getAdminSidebarData } from "@/lib/admin/structure-queries";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSidebarPanelPage({ params }: PageProps) {
  await requirePermission("sidebar");
  const { id } = await params;
  const { panels, categories } = await getAdminSidebarData();
  const panel = panels.find((row) => row.id === id);
  if (!panel) notFound();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{panel.title}</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Chọn category — link bài lấy random mỗi lần load trang.
      </p>
      <SidebarPanelDetail panel={panel} categories={categories} />
    </div>
  );
}
