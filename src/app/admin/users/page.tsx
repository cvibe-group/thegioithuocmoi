import { UsersAdminPanel } from "@/components/admin/UsersAdminPanel";
import { requirePermission } from "@/lib/admin/require-permission";

export default async function AdminUsersPage() {
  const user = await requirePermission("users");

  return (
    <div>
      <h1 className="mb-2 text-[24px] font-bold">Quản lý user</h1>
      <p className="mb-6 text-[14px] text-[#666]">
        Tạo tài khoản CMS, gán role và khóa/xóa user. Cần{" "}
        <code className="rounded bg-[#f0ebf5] px-1 text-[12px]">
          SUPABASE_SERVICE_ROLE_KEY
        </code>
        .
      </p>
      <UsersAdminPanel currentUserId={user.id} />
    </div>
  );
}
