import Link from "next/link";
import type { BreadcrumbItem } from "@/types/content";

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="breadcrumbs" className="mb-4 text-[14px] leading-[1.6] text-[#666666]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`}>
            {index > 0 && <span className="mx-1.5">»</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-[#0a0a0a]" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
