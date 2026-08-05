import { AboutEditor } from "@/components/admin/AboutEditor";
import { getAboutUsSettings } from "@/lib/admin/structure-queries";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminAboutPage() {
  await requirePermission("about");
  const about = await getAboutUsSettings();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">About us</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Nội dung trang `/about-us`.
      </p>
      <AboutEditor initial={about} />
    </div>
  );
}
