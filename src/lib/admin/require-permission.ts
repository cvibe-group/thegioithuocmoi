import { redirect } from "next/navigation";
import {
  getUserRole,
  hasPermission,
  isCmsUser,
  type CmsPermission,
} from "@/lib/admin/auth";
import { createAuthServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export async function getAdminSessionUser(): Promise<User | null> {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isCmsUser(user)) return null;
  return user;
}

/** Redirect to /admin if missing permission (or login if no session). */
export async function requirePermission(
  permission: CmsPermission,
): Promise<User> {
  const user = await getAdminSessionUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!hasPermission(user, permission)) {
    redirect("/admin");
  }
  return user;
}

export async function requireCmsUser(): Promise<User> {
  const user = await getAdminSessionUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}

export function assertUsersPermission(user: User): void {
  if (!hasPermission(user, "users")) {
    throw new Error("FORBIDDEN");
  }
}

export { getUserRole, hasPermission };
