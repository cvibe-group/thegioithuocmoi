import { Suspense } from "react";
import { GlossaryEditor } from "@/components/admin/GlossaryEditor";
import { getAdminGlossaryData } from "@/lib/admin/structure-queries";
import {
  parseAdminPage,
  parseAdminPageSize,
} from "@/lib/admin/pagination";
import { requirePermission } from "@/lib/admin/require-permission";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    q?: string;
  }>;
}

export default async function AdminGlossaryPage({ searchParams }: PageProps) {
  await requirePermission("glossary");
  const params = await searchParams;
  const data = await getAdminGlossaryData(params.tab, {
    page: parseAdminPage(params.page),
    pageSize: parseAdminPageSize(params.pageSize),
    q: params.q,
  });

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Glossary</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Quản lý category glossary (Bệnh học, Xét nghiệm & Chỉ số, Thuật ngữ…) và
        gắn bài viết làm entry A–Z.
      </p>
      <Suspense fallback={<p className="text-[13px] text-[#666]">Đang tải…</p>}>
        <GlossaryEditor
          key={data.activeTab || "empty"}
          tabs={data.tabs}
          activeTab={data.activeTab}
          activeCategory={data.activeCategory}
          initialLinks={data.links}
          linksTotal={data.linksTotal}
        />
      </Suspense>
    </div>
  );
}
