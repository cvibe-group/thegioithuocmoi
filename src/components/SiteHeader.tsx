"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDownIcon, MenuIcon } from "@/components/icons";
import { HeaderSearch } from "@/components/HeaderSearch";
import type { NavItem } from "@/types/content";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);

  if (!item.dropdownItems?.length) {
    return (
      <Link
        href={item.href}
        className={cn(
          "inline-flex items-center gap-0.5 border-b-2 py-2.5 text-[14px] font-bold leading-4 transition-colors",
          active
            ? "border-brand text-brand"
            : "border-transparent text-[#0a0a0a] hover:text-brand",
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="group relative">
      <Link
        href={item.href}
        className={cn(
          "inline-flex items-center gap-0.5 border-b-2 py-2.5 text-[14px] font-bold leading-4 transition-colors",
          active
            ? "border-brand text-brand"
            : "border-transparent text-[#0a0a0a] group-hover:text-brand",
        )}
      >
        {item.label}
        <ChevronDownIcon className="size-3 opacity-70" />
      </Link>

      <div
        className={cn(
          "invisible absolute left-0 top-full z-[1002] min-w-[260px] pt-1",
          "opacity-0 transition-[opacity,visibility] duration-200",
          "group-hover:visible group-hover:opacity-100",
        )}
      >
        <ul className="bg-white py-5 shadow-[1px_1px_15px_rgba(0,0,0,0.15)]">
          {item.dropdownItems.map((sub) => (
            <li key={sub.href}>
              <Link
                href={sub.href}
                className={cn(
                  "block px-5 py-2.5 text-[14px] leading-[1.3] transition-colors hover:text-brand",
                  isActive(pathname, sub.href)
                    ? "text-brand"
                    : "text-[rgba(102,102,102,0.85)]",
                )}
              >
                {sub.text}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileNavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const active = isActive(pathname, item.href);

  if (!item.dropdownItems?.length) {
    return (
      <Link
        href={item.href}
        className={cn(
          "block py-2 text-[14px] font-bold hover:text-brand",
          active ? "text-brand" : "text-[#0a0a0a]",
        )}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between py-2 text-left text-[14px] font-bold",
          active ? "text-brand" : "text-[#0a0a0a]",
        )}
        onClick={() => setOpen((v) => !v)}
      >
        {item.label}
        <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="mb-2 ml-3 border-l border-border-light pl-3">
          {item.dropdownItems.map((sub) => (
            <li key={sub.href}>
              <Link
                href={sub.href}
                className={cn(
                  "block py-1.5 text-[13px] hover:text-brand",
                  isActive(pathname, sub.href)
                    ? "text-brand"
                    : "text-[rgba(102,102,102,0.85)]",
                )}
                onClick={onNavigate}
              >
                {sub.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SiteHeader({
  navItems,
  logoSrc,
}: {
  navItems: NavItem[];
  logoSrc: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-[1001] bg-brand-light transition-[background-color,box-shadow] duration-300",
        scrolled && "shadow-[0_1px_0_rgba(0,0,0,0.06)]",
      )}
    >
      <div className="mx-auto flex h-[74px] max-w-[1140px] items-center justify-between gap-4 px-[15px]">
        <Link href="/" className="shrink-0">
          <Image
            src={logoSrc}
            alt="Thế Giới Thuốc Mới"
            width={200}
            height={68}
            className="h-[54px] w-auto lg:h-[62px]"
            priority
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-x-4 xl:flex">
          {navItems.map((item) => (
            <NavDropdown key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <HeaderSearch />
          <button
            type="button"
            aria-label="Menu"
            className="text-[#0a0a0a] xl:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <MenuIcon className="size-6" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border-light bg-white px-4 py-3 xl:hidden">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.label}>
                <MobileNavItem
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
