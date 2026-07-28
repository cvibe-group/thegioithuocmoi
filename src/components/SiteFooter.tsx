import Link from "next/link";
import { ArrowUpIcon } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border-light bg-brand-light">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row lg:px-[15px]">
        <Link
          href="/about-us"
          className="text-[14px] text-[#0a0a0a] transition-colors hover:text-brand"
        >
          About us
        </Link>
        <p className="text-[14px] text-[#666666]">
          thegioithuocmoi.com © All Rights Reserved - 2023
        </p>
        <a
          href="#top"
          className="flex items-center gap-1 text-[14px] text-brand transition-opacity hover:opacity-80"
        >
          Go to top
          <ArrowUpIcon className="size-4" />
        </a>
      </div>
    </footer>
  );
}
