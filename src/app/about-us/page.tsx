import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { getAboutUsFromDb } from "@/data/queries";

export const metadata: Metadata = {
  title: "About us - Thế Giới Thuốc Mới",
};

export default async function AboutUsPage() {
  const about = await getAboutUsFromDb();

  if (!about) {
    return (
      <PageShell withSidebar={false} fullWidth>
        <p className="mx-auto max-w-[750px] text-[16px] text-[#666666]">
          Chưa có nội dung About us.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell withSidebar={false} fullWidth>
      <article className="mx-auto max-w-[750px]">
        <h1 className="mb-8 text-[28px] font-bold text-[#0a0a0a]">{about.title}</h1>

        <div className="space-y-5 text-[18px] leading-[1.6] text-[#0a0a0a]">
          {about.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}

          <p className="pt-2">
            <span className="font-bold">Đại diện:</span> {about.representative}
          </p>

          <div>
            <p className="mb-2 font-bold">Thành viên:</p>
            <ul className="space-y-1">
              {about.members.map((member) => (
                <li key={member}>{member}</li>
              ))}
            </ul>
          </div>

          <p>
            <span className="font-bold">Địa chỉ:</span> {about.address}
          </p>
        </div>
      </article>
    </PageShell>
  );
}
