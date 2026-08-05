import { notFound } from "next/navigation";
import { HomepageSectionDetail } from "@/components/admin/HomepageSectionDetail";
import { getLatestArticlesByCategory } from "@/data/queries";
import { getAdminHomepageData } from "@/lib/admin/structure-queries";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminHomepageSectionPage({ params }: PageProps) {
  await requirePermission("homepage");
  const { id } = await params;
  const data = await getAdminHomepageData();
  const section = data.sections.find((row) => row.id === id);
  if (!section) notFound();

  const previewArticles = await getLatestArticlesByCategory(section.id, 6);

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">{section.title}</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Sửa tiêu đề / see more. Bài viết lấy tự động theo category.
      </p>
      <HomepageSectionDetail
        section={section}
        previewArticles={previewArticles}
      />
    </div>
  );
}
