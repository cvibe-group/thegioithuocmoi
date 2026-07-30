"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import type { AdminArticle, CategoryOption } from "@/lib/admin/articles";
import { groupCategoryOptions } from "@/lib/admin/articles";
import type { AdminTableColumn } from "@/lib/admin/pagination";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function ArticlesTable({
  articles,
  total,
  categories,
}: {
  articles: AdminArticle[];
  total: number;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const {
    page,
    pageSize,
    q,
    status,
    setPage,
    setPageSize,
    setFilter,
    setParams,
    searchParams,
  } = useAdminPagination();
  const category = searchParams.get("category") ?? "all";
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftQ, setDraftQ] = useState(q);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftQ === q) return;
      startTransition(() => {
        setParams({ q: draftQ.trim() || null }, true);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftQ, q, setParams]);

  async function togglePublish(article: AdminArticle) {
    setBusyId(article.id);
    setError(null);
    const supabase = createAuthBrowserClient();
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        is_published: !article.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", article.id);
    setBusyId(null);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.refresh();
  }

  async function removeArticle(article: AdminArticle) {
    const ok = await confirm({
      title: "Xóa bài viết?",
      description: `Bài “${article.title}” sẽ bị xóa vĩnh viễn và không thể hoàn tác.`,
      confirmLabel: "Xóa bài",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(article.id);
    setError(null);
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("articles")
      .delete()
      .eq("id", article.id);
    setBusyId(null);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.refresh();
  }

  const columns: AdminTableColumn<AdminArticle>[] = [
    {
      key: "title",
      header: "Tiêu đề",
      className: "max-w-[360px]",
      cell: (article) => (
        <>
          <Link
            href={`/admin/articles/${article.id}`}
            className="font-semibold text-brand hover:underline"
          >
            {article.title}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-[#888]">
            {article.path}
          </p>
        </>
      ),
    },
    {
      key: "category",
      header: "Chuyên mục",
      cell: (article) => article.category_label,
    },
    {
      key: "date",
      header: "Ngày",
      className: "whitespace-nowrap",
      cell: (article) => article.date_label,
    },
    {
      key: "status",
      header: "Trạng thái",
      cell: (article) => (
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[11px] font-bold",
            article.is_published
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          )}
        >
          {article.is_published ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      cell: (article) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/articles/${article.id}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <a
            href={article.path}
            target="_blank"
            rel="noreferrer"
            className="text-[#666] hover:underline"
          >
            Xem
          </a>
          <button
            type="button"
            disabled={busyId === article.id}
            onClick={() => togglePublish(article)}
            className="text-[#666] hover:text-brand disabled:opacity-50"
          >
            {article.is_published ? "Ẩn" : "Publish"}
          </button>
          <button
            type="button"
            disabled={busyId === article.id}
            onClick={() => removeArticle(article)}
            className="text-red-600 hover:underline disabled:opacity-50"
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-[12px] font-medium text-[#666]">
            Tìm kiếm
          </span>
          <input
            value={draftQ}
            onChange={(event) => setDraftQ(event.target.value)}
            placeholder="Tiêu đề, chuyên mục, slug..."
            className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-medium text-[#666]">
            Chuyên mục
          </span>
          <select
            value={
              categories.some((item) => item.slug === category) ? category : "all"
            }
            onChange={(event) =>
              setFilter(
                "category",
                event.target.value === "all" ? null : event.target.value,
              )
            }
            className="max-w-[280px] rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
          >
            <option value="all">Tất cả</option>
            {groupCategoryOptions(categories).map(({ root, children }) => (
              <optgroup
                key={root.slug}
                label={
                  root.kind === "glossary"
                    ? `[Glossary] ${root.title}`
                    : root.title
                }
              >
                <option value={root.slug}>
                  {root.kind === "glossary"
                    ? root.title
                    : `${root.title} (chung)`}
                </option>
                {children.map((child) => (
                  <option key={child.slug} value={child.slug}>
                    {child.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-medium text-[#666]">
            Trạng thái
          </span>
          <select
            value={status === "published" || status === "draft" ? status : "all"}
            onChange={(event) =>
              setFilter(
                "status",
                event.target.value === "all" ? null : event.target.value,
              )
            }
            className="rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
          >
            <option value="all">Tất cả</option>
            <option value="published">Đã publish</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <Link
          href="/admin/articles/new"
          className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white"
        >
          + Bài mới
        </Link>
      </div>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={articles}
        rowKey={(row) => row.id}
        emptyMessage="Không có bài viết"
        loading={pending}
      />

      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
