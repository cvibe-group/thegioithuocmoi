import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { requireCmsUser } from "@/lib/admin/require-permission";

export default async function AdminAccountPage() {
  await requireCmsUser();

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Tài khoản</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Đổi mật khẩu đăng nhập CMS (cần nhập mật khẩu hiện tại).
      </p>
      <ChangePasswordForm />
    </div>
  );
}
