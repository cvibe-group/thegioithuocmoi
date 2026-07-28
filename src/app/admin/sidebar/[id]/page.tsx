import { notFound } from "next/navigation";
import { SidebarPanelDetail } from "@/components/admin/SidebarPanelDetail";
import { getAdminSidebarData } from "@/lib/admin/structure-queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSidebarPanelPage({ params }: PageProps) {
  const { id } = await params;
  const { panels, items } = await getAdminSidebarData();
  const panel = panels.find((row) => row.id === id);
  if (!panel) notFound();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{panel.title}</h1>
      <p className="mb-6 text-[14px] text-[#666]">Sửa panel và các link.</p>
      <SidebarPanelDetail
        panel={panel}
        items={items.filter((item) => item.panel_id === id)}
      />
    </div>
  );
}
