"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { ArrowUpIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function BackToTopButton() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function onScroll() {
      setActive(window.scrollY > 200);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <a
      href="#top"
      id="top-link"
      aria-label="Go to top"
      onClick={scrollToTop}
      className={cn(
        "fixed right-5 bottom-5 z-[21] hidden size-[39px] items-center justify-center rounded-full border border-[#0a0a0a] bg-transparent text-[#0a0a0a] transition-[opacity,transform] duration-300 md:flex",
        active
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-[30%] opacity-0",
      )}
    >
      <ArrowUpIcon className="size-[19px]" />
    </a>
  );
}
