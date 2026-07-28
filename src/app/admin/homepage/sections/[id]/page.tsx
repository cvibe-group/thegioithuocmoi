import { notFound } from "next/navigation";
import { HomepageSectionDetail } from "@/components/admin/HomepageSectionDetail";
import { getAdminHomepageData } from "@/lib/admin/structure-queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminHomepageSectionPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getAdminHomepageData();
  const section = data.sections.find((row) => row.id === id);
  if (!section) notFound();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{section.title}</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Sửa section và các bài gắn kèm.
      </p>
      <HomepageSectionDetail
        section={section}
        links={data.links.filter((link) => link.section_id === id)}
        articles={data.articles}
      />
    </div>
  );
}
