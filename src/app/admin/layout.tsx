import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminUser } from "@/lib/admin/auth";
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
  if (!user || !isAdminUser(user)) {
    return <>{children}</>;
  }

  return <AdminShell email={user.email ?? "admin"}>{children}</AdminShell>;
}
