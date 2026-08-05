"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Contact,
  FileText,
  Home,
  Folder,
  ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PanelRight,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import {
  ADMIN_NAV_PERMISSION,
  ROLE_LABELS,
  type CmsPermission,
  type CmsRole,
} from "@/lib/admin/auth";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/articles", label: "Bài viết", icon: FileText },
  { href: "/admin/authors", label: "Tác giả", icon: Contact },
  { href: "/admin/categories", label: "Danh mục", icon: Folder },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/menu", label: "Menu", icon: Menu },
  { href: "/admin/sidebar", label: "Sidebar", icon: PanelRight },
  { href: "/admin/glossary", label: "Glossary", icon: BookOpen },
  { href: "/admin/about", label: "About us", icon: Users },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
  { href: "/admin/users", label: "Users", icon: UserCog },
];

export function AdminShell({
  children,
  email,
  role,
  permissions,
}: {
  children: React.ReactNode;
  email: string;
  role: CmsRole | null;
  permissions: CmsPermission[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = new Set(permissions);

  const visibleNav = nav.filter((item) => {
    const need = ADMIN_NAV_PERMISSION[item.href];
    return need ? allowed.has(need) : true;
  });

  async function signOut() {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f4f8] text-[#0a0a0a]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="relative hidden w-60 shrink-0 border-r border-border-light bg-white md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b border-border-light px-4">
            <Palette className="size-4 text-brand" />
            <span className="text-[14px] font-bold">CMS Admin</span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {visibleNav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium transition-colors",
                    active
                      ? "bg-brand text-white"
                      : "text-[#444] hover:bg-brand-light hover:text-brand",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border-light p-3">
            <p className="mb-0.5 truncate px-2 text-[12px] text-[#666]">{email}</p>
            {role ? (
              <p className="mb-2 px-2 text-[11px] font-medium text-brand">
                {ROLE_LABELS[role]}
              </p>
            ) : null}
            <Link
              href="/admin/account"
              className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-[14px] text-[#444] hover:bg-brand-light hover:text-brand"
            >
              <KeyRound className="size-4" />
              Đổi mật khẩu
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[14px] text-[#444] hover:bg-brand-light hover:text-brand"
            >
              <LogOut className="size-4" />
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b border-[#ece4f3] bg-white px-4 md:px-6">
            <div className="flex items-center gap-3 md:hidden">
              <span className="text-[14px] font-bold">CMS Admin</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/admin/account"
                className="text-[13px] font-medium text-[#666] hover:text-brand"
              >
                Đổi MK
              </Link>
              <Link
                href="/"
                target="_blank"
                className="text-[13px] font-medium text-brand hover:opacity-80"
              >
                Xem site
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-md border border-[#ece4f3] px-3 py-1.5 text-[13px] md:hidden"
              >
                Đăng xuất
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
