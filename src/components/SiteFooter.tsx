import Link from "next/link";
import { BackToTopButton } from "@/components/BackToTopButton";

export function SiteFooter() {
  return (
    <footer id="footer" className="footer-wrapper mt-0">
      <div className="bg-brand px-0 pt-2.5 pb-[15px] text-center text-[14.4px] leading-[1.6] text-white/50">
        <div className="mx-auto max-w-[1140px] px-[15px]">
          <ul className="m-0 list-none p-0">
            <li className="inline-block">
              <Link
                href="/about-us"
                className="text-[18px] leading-[1.2] tracking-[0.034em] text-white no-underline transition-opacity hover:opacity-80"
              >
                About us
              </Link>
            </li>
          </ul>
          <div className="copyright-footer mt-0 text-[14.4px] leading-[1.6] text-white">
            thegioithuocmoi.com © All Rights Reserved - 2023
          </div>
        </div>
      </div>
      <BackToTopButton />
    </footer>
  );
}
