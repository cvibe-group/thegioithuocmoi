"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { createBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SearchHit = {
  href: string;
  title: string;
  category: string;
};

function escapeIlikePattern(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function HeaderSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const run = async () => {
      const q = query.trim();
      if (!q || !isSupabaseConfigured()) {
        setHits([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const supabase = createBrowserClient();
        const pattern = `%${escapeIlikePattern(q)}%`;
        const quoted = `"${pattern.replace(/"/g, '\\"')}"`;
        const { data, error } = await supabase
          .from("articles")
          .select("path, title, category_label")
          .eq("is_published", true)
          .or(
            `title.ilike.${quoted},category_label.ilike.${quoted},excerpt.ilike.${quoted}`,
          )
          .order("date_label", { ascending: false })
          .limit(8);

        if (cancelled) return;
        if (error || !data) {
          setHits([]);
          return;
        }

        setHits(
          data.map((row) => ({
            href: row.path,
            title: row.title,
            category: row.category_label,
          })),
        );
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = window.setTimeout(run, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  function goToResults(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(trimmed)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    goToResults(query);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Search"
        aria-expanded={open}
        aria-controls="header-search-dropdown"
        className="text-brand transition-opacity hover:opacity-80"
        onClick={() => setOpen((value) => !value)}
      >
        <SearchIcon className="size-5" />
      </button>

      {open ? (
        <div
          id="header-search-dropdown"
          className="absolute right-0 top-full z-[1002] mt-2 w-[260px] bg-white p-4 shadow-[1px_1px_15px_rgba(0,0,0,0.15)]"
        >
          <form onSubmit={onSubmit} className="flex items-stretch">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Bạn đang tìm..."
              aria-label="Search input"
              className="min-w-0 flex-1 rounded-l-[5px] border border-brand border-r-0 px-2.5 py-2 text-[12px] text-[#0a0a0a] outline-none"
            />
            <button
              type="submit"
              aria-label="Search magnifier button"
              className="flex w-9 shrink-0 items-center justify-center rounded-r-[5px] bg-brand text-white hover:opacity-90"
            >
              <SearchIcon className="size-4" />
            </button>
          </form>

          {query.trim() ? (
            <ul className="mt-3 max-h-[320px] overflow-y-auto border-t border-border-light pt-2">
              {loading ? (
                <li className="px-1 py-2 text-[12px] text-[#666666]">Đang tìm…</li>
              ) : hits.length === 0 ? (
                <li className="px-1 py-2 text-[12px] text-[#666666]">
                  Không tìm thấy kết quả
                </li>
              ) : (
                hits.map((hit) => (
                  <li key={hit.href}>
                    <Link
                      href={hit.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block rounded px-1 py-2 transition-colors hover:bg-brand-light",
                      )}
                    >
                      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.4px] text-[#666666]">
                        {hit.category}
                      </p>
                      <p className="text-[13px] font-bold leading-[1.35] text-brand">
                        {hit.title}
                      </p>
                    </Link>
                  </li>
                ))
              )}
              {!loading && hits.length > 0 ? (
                <li>
                  <button
                    type="button"
                    onClick={() => goToResults(query)}
                    className="mt-1 w-full px-1 py-2 text-left text-[12px] font-bold text-brand hover:underline"
                  >
                    Xem tất cả kết quả »
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
