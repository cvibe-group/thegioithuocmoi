import { AdminShell } from "@/components/admin/AdminShell";
import {
  getUserRole,
  isCmsUser,
  permissionsForRole,
} from "@/lib/admin/auth";
import { createAuthServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page renders without shell
  if (!user || !isCmsUser(user)) {
    return <>{children}</>;
  }

  const role = getUserRole(user);
  const permissions = role ? [...permissionsForRole(role)] : [];

  return (
    <AdminShell
      email={user.email ?? "admin"}
      role={role}
      permissions={permissions}
    >
      {children}
    </AdminShell>
  );
}
