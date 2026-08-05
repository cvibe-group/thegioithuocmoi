/**
 * Smoke: CMS role permissions (npx tsx scripts/smoke-cms-roles.ts)
 */
import {
  canWriteCms,
  getUserRole,
  hasPermission,
  isCmsUser,
  normalizeRole,
  ROLE_PERMISSIONS,
  type CmsRole,
} from "../src/lib/admin/auth";
import type { User } from "@supabase/supabase-js";

function fakeUser(role: string): User {
  return {
    id: "x",
    app_metadata: { role },
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  } as User;
}

const cases: Array<{ role: string; expect: CmsRole }> = [
  { role: "admin", expect: "super_admin" },
  { role: "super_admin", expect: "super_admin" },
  { role: "editor", expect: "editor" },
  { role: "author", expect: "author" },
  { role: "viewer", expect: "viewer" },
];

for (const c of cases) {
  if (normalizeRole(c.role) !== c.expect) {
    throw new Error(`normalizeRole(${c.role})`);
  }
  const u = fakeUser(c.role);
  if (!isCmsUser(u)) throw new Error(`isCmsUser ${c.role}`);
  if (getUserRole(u) !== c.expect) throw new Error(`getUserRole ${c.role}`);
}

if (!hasPermission(fakeUser("super_admin"), "users")) {
  throw new Error("super_admin users");
}
if (hasPermission(fakeUser("editor"), "users")) {
  throw new Error("editor should not have users");
}
if (hasPermission(fakeUser("viewer"), "articles.write")) {
  throw new Error("viewer should not write articles");
}
if (!hasPermission(fakeUser("author"), "articles.write")) {
  throw new Error("author articles.write");
}
if (!canWriteCms(fakeUser("author"))) throw new Error("author canWrite");
if (canWriteCms(fakeUser("viewer"))) throw new Error("viewer cannot write");

if (ROLE_PERMISSIONS.viewer.includes("media")) {
  throw new Error("viewer media");
}

console.log("OK cms roles", Object.keys(ROLE_PERMISSIONS).join(","));
