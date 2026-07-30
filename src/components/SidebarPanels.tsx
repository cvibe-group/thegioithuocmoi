import Link from "next/link";
import type { SidebarPanel } from "@/types/content";
import { cn } from "@/lib/utils";

interface SidebarPanelsProps {
  panels: SidebarPanel[];
  className?: string;
}

export function SidebarPanels({ panels, className }: SidebarPanelsProps) {
  return (
    <aside className={cn("space-y-8", className)}>
      {panels.map((panel) => (
        <section
          key={panel.title}
          className="overflow-hidden rounded-[5px] border border-brand"
        >
          <h3 className="flex h-[38px] items-center bg-brand px-3 text-[20px] font-bold leading-8 text-white">
            {panel.title}
          </h3>
          <ul className="mb-4 px-[17px]">
            {panel.items.map((item) => (
              <li
                key={item.text}
                className="border-b border-[#ebbee7]"
              >
                <Link
                  href={item.href}
                  className="block py-0.5 text-[14px] leading-[1.6] text-black transition-colors hover:text-brand"
                >
                  {item.text}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-3 pb-4 text-center">
            <Link
              href={panel.seeAllHref}
              className="inline-block rounded border border-brand px-[18px] py-1.5 text-[15.5px] font-bold tracking-[0.47px] text-brand transition-colors hover:bg-brand hover:text-white"
            >
              Xem tất cả
            </Link>
          </div>
        </section>
      ))}
    </aside>
  );
}
