import { notFound } from "next/navigation";
import { MenuItemDetail } from "@/components/admin/MenuItemDetail";
import { getAdminNavData } from "@/lib/admin/structure-queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminMenuItemPage({ params }: PageProps) {
  const { id } = await params;
  const { items, dropdowns } = await getAdminNavData();
  const item = items.find((row) => row.id === id);
  if (!item) notFound();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{item.label}</h1>
      <p className="mb-6 text-[14px] text-[#666]">Sửa mục menu và dropdown.</p>
      <MenuItemDetail
        item={item}
        dropdowns={dropdowns.filter((d) => d.nav_item_id === id)}
      />
    </div>
  );
}
