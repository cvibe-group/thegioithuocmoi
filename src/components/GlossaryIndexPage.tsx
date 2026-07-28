"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { GLOSSARY_ALPHABET } from "@/data/constants";
import type { GlossaryPageData } from "@/types/content";
import { cn } from "@/lib/utils";

interface GlossaryTab {
  id: string;
  label: string;
  href: string;
}

interface GlossaryIndexPageProps {
  data: GlossaryPageData;
  tabs: GlossaryTab[];
}

export function GlossaryIndexPage({ data, tabs }: GlossaryIndexPageProps) {
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState("All");

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.sections
      .filter((section) => activeLetter === "All" || section.letter === activeLetter)
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            normalizedQuery === "" ||
            item.text.toLowerCase().includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [activeLetter, data.sections, query]);

  return (
    <div className="mx-auto max-w-[900px]">
      <h1 className="mb-6 text-center text-[28px] font-bold text-[#0a0a0a]">
        {tabs.find((tab) => tab.id === data.activeTab)?.label}
      </h1>

      <div className="mb-8 flex justify-center gap-8 border-b border-border-light">
        {tabs.map((tab) => {
          const isActive = tab.id === data.activeTab;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "pb-3 text-[14px] font-bold transition-colors",
                isActive
                  ? "border-b-2 border-brand text-brand"
                  : "text-[#666666] hover:text-brand",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <form
        className="relative mb-6"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Bạn đang tìm...."
          className="w-full rounded border border-[#d9d9d9] py-3 pl-4 pr-14 text-[14px] outline-none focus:border-brand"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-0 top-0 flex h-full w-12 items-center justify-center bg-brand text-white"
        >
          <SearchIcon className="size-5" />
        </button>
      </form>

      <div className="mb-8 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {GLOSSARY_ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => setActiveLetter(letter)}
            className={cn(
              "text-[14px] font-bold transition-colors",
              activeLetter === letter
                ? "text-brand underline"
                : "text-brand hover:opacity-80",
            )}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {filteredSections.map((section) => (
          <section key={section.letter}>
            <div className="mb-3 bg-[#f5f5f5] px-4 py-2">
              <h2 className="text-[18px] font-bold text-[#0a0a0a]">{section.letter}</h2>
            </div>
            <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
              {section.items.map((item) => (
                <li key={item.text}>
                  <Link
                    href={item.href}
                    className="text-[14px] leading-[1.6] text-brand transition-opacity hover:opacity-80"
                  >
                    {item.text}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
