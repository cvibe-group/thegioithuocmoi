import { HomepageOverview } from "@/components/admin/HomepageOverview";
import { getAdminHomepageData } from "@/lib/admin/structure-queries";

export default async function AdminHomepagePage() {
  const data = await getAdminHomepageData();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Homepage</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Featured / secondary và danh sách section. Sửa section để gắn bài.
      </p>
      <HomepageOverview
        featuredPath={data.featuredPath}
        secondaryPaths={data.secondaryPaths}
        sections={data.sections}
        articles={data.articles}
      />
    </div>
  );
}
