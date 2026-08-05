import { HomepageOverview } from "@/components/admin/HomepageOverview";
import { getAdminHomepageData } from "@/lib/admin/structure-queries";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminHomepagePage() {
  await requirePermission("homepage");
  const data = await getAdminHomepageData();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Homepage</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Featured / Secondary lấy bài mới nhất tự động. Sections gắn category và
        hiển thị 6 bài mới nhất.
      </p>
      <HomepageOverview sections={data.sections} categories={data.categories} />
    </div>
  );
}
