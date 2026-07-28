import { BrandingSettingsForm } from "@/components/admin/BrandingSettingsForm";
import { getBrandingFromDb } from "@/data/queries";

export default async function AdminSettingsPage() {
  const branding = await getBrandingFromDb();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Cài đặt</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Logo, favicon và màu chủ đạo áp dụng ngay trên site public.
      </p>
      <BrandingSettingsForm initial={branding} />
    </div>
  );
}
