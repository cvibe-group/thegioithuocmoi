"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import type {
  AdminCategory,
  CategoryArticleLink,
} from "@/lib/admin/category-queries";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";

type SearchHit = {
  path: string;
  title: string;
  category_label: string;
  is_published: boolean;
};

type LayoutValue = "card" | "wide" | "featured" | "";

export function CategoryArticlesPanel({
  category,
  initialLinks,
  onClose,
  hideLayout = false,
}: {
  category: AdminCategory;
  initialLinks: CategoryArticleLink[];
  onClose?: () => void;
  /** Glossary index ignores card/wide/featured layout. */
  hideLayout?: boolean;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const [links, setLinks] = useState(initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const searchArticles = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const { data, error: searchError } = await supabase
        .from("articles")
        .select("path, title, category_label, is_published")
        .or(
          `title.ilike.%${trimmed}%,slug.ilike.%${trimmed}%,path.ilike.%${trimmed}%`,
        )
        .order("updated_at", { ascending: false })
        .limit(20);
      if (searchError) throw new Error(searchError.message);
      setHits((data ?? []) as SearchHit[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tìm bài thất bại");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchArticles(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, searchArticles]);

  async function persistOrder(next: CategoryArticleLink[]) {
    const supabase = createAuthBrowserClient();
    const { error: upsertError } = await supabase.from("category_articles").upsert(
      next.map((link, index) => ({
        category_slug: category.slug,
        article_path: link.article_path,
        sort_order: index,
        layout: link.layout,
      })),
    );
    if (upsertError) throw new Error(upsertError.message);
    setLinks(next.map((link, index) => ({ ...link, sort_order: index })));
    router.refresh();
  }

  async function onAddArticle(hit: SearchHit) {
    setError(null);
    if (links.some((link) => link.article_path === hit.path)) {
      setError("Bài này đã có trong danh mục.");
      return;
    }
    setBusyPath(hit.path);
    try {
      const supabase = createAuthBrowserClient();
      const sortOrder = links.length;
      const { error: insertError } = await supabase.from("category_articles").upsert({
        category_slug: category.slug,
        article_path: hit.path,
        sort_order: sortOrder,
        layout: null,
      });
      if (insertError) throw new Error(insertError.message);

      setLinks((prev) => [
        ...prev,
        {
          article_path: hit.path,
          sort_order: sortOrder,
          layout: null,
          title: hit.title,
          is_published: hit.is_published,
          category_label: hit.category_label,
        },
      ]);
      setQuery("");
      setHits([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thêm bài thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  async function onRemoveArticle(link: CategoryArticleLink) {
    setError(null);
    const ok = await confirm({
      title: `Gỡ bài “${link.title}”?`,
      description: "Bài viết vẫn còn trong hệ thống, chỉ bị gỡ khỏi danh mục này.",
      confirmLabel: "Gỡ",
      tone: "danger",
    });
    if (!ok) return;

    setBusyPath(link.article_path);
    try {
      const supabase = createAuthBrowserClient();
      const { error: deleteError } = await supabase
        .from("category_articles")
        .delete()
        .eq("category_slug", category.slug)
        .eq("article_path", link.article_path);
      if (deleteError) throw new Error(deleteError.message);

      const next = links
        .filter((row) => row.article_path !== link.article_path)
        .map((row, index) => ({ ...row, sort_order: index }));
      await persistOrder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gỡ bài thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  async function onMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    setError(null);
    setBusyPath(links[index].article_path);
    try {
      const next = [...links];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      await persistOrder(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi thứ tự thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  async function onChangeLayout(path: string, layout: LayoutValue) {
    setError(null);
    setBusyPath(path);
    try {
      const supabase = createAuthBrowserClient();
      const value = layout === "" ? null : layout;
      const { error: updateError } = await supabase
        .from("category_articles")
        .update({ layout: value })
        .eq("category_slug", category.slug)
        .eq("article_path", path);
      if (updateError) throw new Error(updateError.message);
      setLinks((prev) =>
        prev.map((link) =>
          link.article_path === path ? { ...link, layout: value } : link,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi layout thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    void searchArticles(query);
  }

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      {dialog}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">
            Bài trong “{category.title}”
          </h3>
          <p className="mt-1 truncate text-[12px] text-[#666]">
            <code>{category.slug}</code> · {links.length} bài
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border-light p-2 hover:bg-brand-light"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <form onSubmit={onSearchSubmit} className="mb-4 space-y-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#666]">
            Thêm bài viết
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề / slug / path…"
            className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
        {searching ? (
          <p className="text-[12px] text-[#666]">Đang tìm…</p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="max-h-48 overflow-auto rounded border border-border-light">
            {hits.map((hit) => {
              const already = links.some((link) => link.article_path === hit.path);
              return (
                <li
                  key={hit.path}
                  className="flex items-center justify-between gap-2 border-b border-border-light px-3 py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{hit.title}</p>
                    <p className="truncate text-[11px] text-[#666]">
                      <code>{hit.path}</code>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={already || busyPath === hit.path}
                    onClick={() => onAddArticle(hit)}
                    className="inline-flex shrink-0 items-center gap-1 rounded bg-brand px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                    {already ? "Đã có" : "Thêm"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </form>

      {links.length === 0 ? (
        <p className="text-[13px] text-[#666]">Chưa có bài nào trong danh mục này.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link, index) => (
            <li
              key={link.article_path}
              className="rounded border border-border-light p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold">
                    {index + 1}. {link.title}
                    {!link.is_published ? (
                      <span className="ml-2 text-[11px] font-medium text-amber-700">
                        nháp
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#666]">
                    <code>{link.article_path}</code>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {!hideLayout ? (
                    <select
                      value={link.layout ?? ""}
                      disabled={busyPath === link.article_path}
                      onChange={(e) =>
                        onChangeLayout(
                          link.article_path,
                          e.target.value as LayoutValue,
                        )
                      }
                      className="rounded border border-border-light px-2 py-1 text-[12px] outline-none focus:border-brand"
                    >
                      <option value="">layout mặc định</option>
                      <option value="card">card</option>
                      <option value="wide">wide</option>
                      <option value="featured">featured</option>
                    </select>
                  ) : null}
                  <button
                    type="button"
                    disabled={index === 0 || busyPath === link.article_path}
                    onClick={() => onMove(index, -1)}
                    className="rounded border border-border-light p-1.5 hover:bg-brand-light disabled:opacity-40"
                    aria-label="Lên"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={
                      index === links.length - 1 || busyPath === link.article_path
                    }
                    onClick={() => onMove(index, 1)}
                    className="rounded border border-border-light p-1.5 hover:bg-brand-light disabled:opacity-40"
                    aria-label="Xuống"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={busyPath === link.article_path}
                    onClick={() => onRemoveArticle(link)}
                    className="rounded border border-border-light p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    aria-label="Gỡ"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
