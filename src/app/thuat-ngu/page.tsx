import type { Metadata } from "next";
import { GlossaryIndexPage } from "@/components/GlossaryIndexPage";
import { PageShell } from "@/components/PageShell";
import { getGlossaryPageFromDb, getGlossaryTabsFromDb } from "@/data/queries";

export const metadata: Metadata = {
  title: "Thuật ngữ - Thế Giới Thuốc Mới",
};

export default async function ThuatNguPage() {
  const [data, tabs] = await Promise.all([
    getGlossaryPageFromDb("thuat-ngu"),
    getGlossaryTabsFromDb(),
  ]);

  if (!data) {
    return (
      <PageShell withSidebar={false} fullWidth>
        <p className="text-center text-[16px] text-[#666666]">Chưa có nội dung.</p>
      </PageShell>
    );
  }

  return (
    <PageShell withSidebar={false} fullWidth>
      <GlossaryIndexPage data={data} tabs={tabs} />
    </PageShell>
  );
}
