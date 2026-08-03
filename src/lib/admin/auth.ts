import type { User } from "@supabase/supabase-js";

/** CMS admin role stored in Auth app_metadata.role */
export const ADMIN_ROLE = "admin";

export function isAdminUser(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  if (!user) return false;
  return user.app_metadata?.role === ADMIN_ROLE;
}
