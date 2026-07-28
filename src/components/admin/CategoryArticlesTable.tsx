"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import type {
  AdminCategory,
  CategoryArticleLink,
} from "@/lib/admin/category-queries";
import type { AdminTableColumn } from "@/lib/admin/pagination";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

type SearchHit = {
  path: string;
  title: string;
  category_label: string;
  is_published: boolean;
};

type LayoutValue = "card" | "wide" | "featured" | "";

export function CategoryArticlesTable({
  category,
  initialLinks,
  total,
  hideLayout = false,
  paramPrefix = "",
}: {
  category: AdminCategory;
  initialLinks: CategoryArticleLink[];
  total: number;
  hideLayout?: boolean;
  /** Prefix for URL params when nested with other tables, e.g. "art" → artPage */
  paramPrefix?: string;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const pageKey = paramPrefix ? `${paramPrefix}Page` : "page";
  const pageSizeKey = paramPrefix ? `${paramPrefix}PageSize` : "pageSize";
  const qKey = paramPrefix ? `${paramPrefix}Q` : "q";

  const search = useAdminPagination();
  const page = Number(search.searchParams.get(pageKey) ?? "1") || 1;
  const pageSize = Number(search.searchParams.get(pageSizeKey) ?? "25") || 25;
  const q = search.searchParams.get(qKey) ?? "";

  const [links, setLinks] = useState(initialLinks);
  const [draftQ, setDraftQ] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftQ === q) return;
      startTransition(() => {
        search.setParams(
          { [qKey]: draftQ.trim() || null, [pageKey]: "1" },
          false,
        );
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftQ, q, qKey, pageKey, search]);

  const searchArticles = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
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

  async function onAddArticle(hit: SearchHit) {
    setError(null);
    if (links.some((link) => link.article_path === hit.path)) {
      setError("Bài này đã có trong danh mục.");
      return;
    }
    setBusyPath(hit.path);
    try {
      const supabase = createAuthBrowserClient();
      const { count } = await supabase
        .from("category_articles")
        .select("*", { count: "exact", head: true })
        .eq("category_slug", category.slug);
      const { error: insertError } = await supabase
        .from("category_articles")
        .upsert({
          category_slug: category.slug,
          article_path: hit.path,
          sort_order: count ?? 0,
          layout: null,
        });
      if (insertError) throw new Error(insertError.message);
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
    const ok = await confirm({
      title: `Gỡ bài “${link.title}”?`,
      description: "Bài vẫn còn trong hệ thống, chỉ gỡ khỏi danh mục này.",
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gỡ bài thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  async function onMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    setBusyPath(links[index].article_path);
    try {
      const next = [...links];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      const supabase = createAuthBrowserClient();
      const base = (page - 1) * pageSize;
      const { error: upsertError } = await supabase
        .from("category_articles")
        .upsert(
          next.map((link, i) => ({
            category_slug: category.slug,
            article_path: link.article_path,
            sort_order: base + i,
            layout: link.layout,
          })),
        );
      if (upsertError) throw new Error(upsertError.message);
      setLinks(next.map((link, i) => ({ ...link, sort_order: base + i })));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi thứ tự thất bại");
    } finally {
      setBusyPath(null);
    }
  }

  async function onChangeLayout(path: string, layout: LayoutValue) {
    setBusyPath(path);
    try {
      const value = layout === "" ? null : layout;
      const supabase = createAuthBrowserClient();
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

  const columns: AdminTableColumn<CategoryArticleLink>[] = [
    {
      key: "title",
      header: "Bài viết",
      cell: (link) => (
        <>
          <p className="font-medium">
            {link.title}
            {!link.is_published ? (
              <span className="ml-2 text-[11px] text-amber-700">nháp</span>
            ) : null}
          </p>
          <p className="truncate text-[11px] text-[#888]">
            <code>{link.article_path}</code>
          </p>
        </>
      ),
    },
    ...(!hideLayout
      ? [
          {
            key: "layout",
            header: "Layout",
            cell: (link: CategoryArticleLink) => (
              <select
                value={link.layout ?? ""}
                disabled={busyPath === link.article_path}
                onChange={(e) =>
                  onChangeLayout(link.article_path, e.target.value as LayoutValue)
                }
                className="rounded border border-border-light px-2 py-1 text-[12px]"
              >
                <option value="">mặc định</option>
                <option value="card">card</option>
                <option value="wide">wide</option>
                <option value="featured">featured</option>
              </select>
            ),
          } satisfies AdminTableColumn<CategoryArticleLink>,
        ]
      : []),
    {
      key: "actions",
      header: "Thao tác",
      cell: (link) => {
        const index = links.findIndex((l) => l.article_path === link.article_path);
        return (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={index <= 0 || busyPath === link.article_path}
              onClick={() => onMove(index, -1)}
              className="rounded border border-border-light p-1.5 disabled:opacity-40"
              aria-label="Lên"
            >
              <ArrowUp className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={
                index < 0 ||
                index >= links.length - 1 ||
                busyPath === link.article_path
              }
              onClick={() => onMove(index, 1)}
              className="rounded border border-border-light p-1.5 disabled:opacity-40"
              aria-label="Xuống"
            >
              <ArrowDown className="size-3.5" />
            </button>
            <button
              type="button"
              disabled={busyPath === link.article_path}
              onClick={() => onRemoveArticle(link)}
              className="rounded border border-border-light p-1.5 text-red-600 disabled:opacity-40"
              aria-label="Gỡ"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
      {dialog}
      <div>
        <h3 className="text-[15px] font-bold">Bài trong “{category.title}”</h3>
        <p className="text-[12px] text-[#666]">{total} bài</p>
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[#666]">
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
        {searching ? <p className="text-[12px] text-[#666]">Đang tìm…</p> : null}
        {hits.length > 0 ? (
          <ul className="max-h-40 overflow-auto rounded border border-border-light">
            {hits.map((hit) => {
              const already = links.some((l) => l.article_path === hit.path);
              return (
                <li
                  key={hit.path}
                  className="flex items-center justify-between gap-2 border-b border-border-light px-3 py-2 last:border-0"
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
      </div>

      <label className="block max-w-sm">
        <span className="mb-1 block text-[12px] font-medium text-[#666]">
          Lọc trong danh mục
        </span>
        <input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="Lọc bài đã gắn…"
          className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>

      <AdminDataTable
        columns={columns}
        rows={links}
        rowKey={(row) => row.article_path}
        emptyMessage="Chưa có bài nào"
        loading={pending}
      />
      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => search.setParams({ [pageKey]: String(p) })}
        onPageSizeChange={(s) =>
          search.setParams({ [pageSizeKey]: String(s), [pageKey]: "1" })
        }
      />
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      <p className="text-[12px] text-[#666]">
        Xem bài tại{" "}
        <Link href="/admin/articles" className="text-brand hover:underline">
          Articles
        </Link>
      </p>
    </div>
  );
}
