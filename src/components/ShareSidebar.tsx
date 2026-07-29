"use client";

import { useSyncExternalStore } from "react";

function useOrigin() {
  return useSyncExternalStore(
    () => () => { },
    () => window.location.origin,
    () => "",
  );
}

interface ShareSidebarProps {
  title: string;
  path: string;
}

export function ShareSidebar({ title, path }: ShareSidebarProps) {
  const origin = useOrigin();
  const shareUrl = origin ? `${origin}${path}` : path;
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const links = [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer.php?u=${encodedUrl}`,
      color: "bg-[#3b5998]",
      mark: "f",
    },
    {
      label: "Share on Twitter",
      href: `https://twitter.com/share?url=${encodedUrl}&text=${encodedTitle}`,
      color: "bg-[#1da1f2]",
      mark: "𝕏",
    },
    {
      label: "Email to a Friend",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      color: "bg-[#222222]",
      mark: "@",
    },
    {
      label: "Pin on Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      color: "bg-[#e60023]",
      mark: "P",
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`,
      color: "bg-[#0a66c2]",
      mark: "in",
    },
  ];

  return (
    <aside className="pointer-events-none absolute top-24 -left-[52px] hidden flex-col gap-2 xl:flex">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label}
          className={`pointer-events-auto flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-sm ${link.color}`}
        >
          {link.mark}
        </a>
      ))}
    </aside>
  );
}
