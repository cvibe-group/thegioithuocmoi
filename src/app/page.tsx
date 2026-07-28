import { ArticleSectionBlock } from "@/components/ArticleSectionBlock";
import { FeaturedNews } from "@/components/FeaturedNews";
import { PageShell } from "@/components/PageShell";
import { getHomepageDataFromDb } from "@/data/queries";

export default async function Home() {
  const data = await getHomepageDataFromDb();
  if (!data?.featured) {
    return (
      <PageShell>
        <p className="text-[16px] text-[#666666]">Chưa có nội dung trang chủ.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <FeaturedNews featured={data.featured} secondary={data.secondary} />
      {data.sections.map((section) => (
        <ArticleSectionBlock key={section.id} section={section} />
      ))}
    </PageShell>
  );
}
