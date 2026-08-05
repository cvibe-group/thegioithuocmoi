import type { User } from "@supabase/supabase-js";

/** Legacy role — treated as super_admin */
export const ADMIN_ROLE = "admin";

export const CMS_ROLES = [
  "super_admin",
  "editor",
  "author",
  "viewer",
] as const;

export type CmsRole = (typeof CMS_ROLES)[number];

export type CmsPermission =
  | "dashboard"
  | "articles.read"
  | "articles.write"
  | "authors"
  | "categories"
  | "homepage"
  | "menu"
  | "sidebar"
  | "glossary"
  | "about"
  | "media"
  | "settings"
  | "users";

export const ROLE_LABELS: Record<CmsRole, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  author: "Author",
  viewer: "Viewer",
};

const ALL_PERMISSIONS: CmsPermission[] = [
  "dashboard",
  "articles.read",
  "articles.write",
  "authors",
  "categories",
  "homepage",
  "menu",
  "sidebar",
  "glossary",
  "about",
  "media",
  "settings",
  "users",
];

/** Roles that may write CMS tables (matches public.is_admin()). */
export const CMS_WRITE_ROLES: ReadonlySet<CmsRole | typeof ADMIN_ROLE> = new Set([
  "super_admin",
  ADMIN_ROLE,
  "editor",
  "author",
]);

export const ROLE_PERMISSIONS: Record<CmsRole, readonly CmsPermission[]> = {
  super_admin: ALL_PERMISSIONS,
  editor: [
    "dashboard",
    "articles.read",
    "articles.write",
    "authors",
    "categories",
    "homepage",
    "menu",
    "sidebar",
    "glossary",
    "about",
    "media",
  ],
  author: ["dashboard", "articles.read", "articles.write", "media"],
  viewer: ["dashboard", "articles.read"],
};

export function isCmsRole(value: string | null | undefined): value is CmsRole {
  return CMS_ROLES.includes(value as CmsRole);
}

/** Map JWT role (incl. legacy `admin`) to canonical CmsRole. */
export function normalizeRole(
  value: string | null | undefined,
): CmsRole | null {
  if (!value) return null;
  if (value === ADMIN_ROLE) return "super_admin";
  if (isCmsRole(value)) return value;
  return null;
}

export function getUserRole(
  user: Pick<User, "app_metadata"> | null | undefined,
): CmsRole | null {
  if (!user) return null;
  const raw = user.app_metadata?.role;
  return normalizeRole(typeof raw === "string" ? raw : null);
}

/** Any CMS staff role (incl. viewer). */
export function isCmsUser(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  return getUserRole(user) != null;
}

/** @deprecated Use isCmsUser — kept for call-site compatibility. */
export function isAdminUser(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  return isCmsUser(user);
}

export function canWriteCms(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  if (!user) return false;
  const raw = user.app_metadata?.role;
  if (typeof raw !== "string") return false;
  return CMS_WRITE_ROLES.has(raw as CmsRole | typeof ADMIN_ROLE);
}

export function hasPermission(
  user: Pick<User, "app_metadata"> | null | undefined,
  permission: CmsPermission,
): boolean {
  const role = getUserRole(user);
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: CmsRole): readonly CmsPermission[] {
  return ROLE_PERMISSIONS[role];
}

/** Nav href → required permission */
export const ADMIN_NAV_PERMISSION: Record<string, CmsPermission> = {
  "/admin": "dashboard",
  "/admin/articles": "articles.read",
  "/admin/authors": "authors",
  "/admin/categories": "categories",
  "/admin/homepage": "homepage",
  "/admin/menu": "menu",
  "/admin/sidebar": "sidebar",
  "/admin/glossary": "glossary",
  "/admin/about": "about",
  "/admin/media": "media",
  "/admin/settings": "settings",
  "/admin/users": "users",
};
