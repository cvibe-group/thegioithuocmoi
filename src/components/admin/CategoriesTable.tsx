"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import type { AdminCategory } from "@/lib/admin/category-queries";
import type { AdminTableColumn } from "@/lib/admin/pagination";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function CategoriesTable({
  categories,
  total,
}: {
  categories: AdminCategory[];
  total: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const { page, pageSize, q, setPage, setPageSize, setFilter, setParams, searchParams } =
    useAdminPagination();
  const kind = searchParams.get("kind") ?? "all";
  const [draftQ, setDraftQ] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draftQ === q) return;
      startTransition(() => setParams({ q: draftQ.trim() || null }, true));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftQ, q, setParams]);

  async function onDelete(cat: AdminCategory) {
    setError(null);
    if (cat.article_count > 0) {
      setError(`Không thể xóa. Category còn ${cat.article_count} bài viết.`);
      return;
    }
    if (cat.subcategory_count > 0) {
      setError(`Không thể xóa. Category còn ${cat.subcategory_count} subcategory.`);
      return;
    }
    const ok = await confirm({
      title: `Xóa category “${cat.title}”?`,
      description: "Menu / homepage liên quan (nếu có) cũng sẽ được gỡ.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;

    setBusySlug(cat.slug);
    try {
      const supabase = createAuthBrowserClient();
      const href = `/${cat.slug}`;
      await supabase.from("nav_dropdown_items").delete().eq("href", href);
      await supabase.from("nav_items").delete().eq("href", href);
      await supabase.from("homepage_sections").delete().eq("id", cat.slug);
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("slug", cat.slug);
      if (deleteError) throw new Error(deleteError.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setBusySlug(null);
    }
  }

  const columns: AdminTableColumn<AdminCategory>[] = [
    {
      key: "title",
      header: "Tên",
      cell: (cat) => (
        <>
          <Link
            href={`/admin/categories/${cat.slug}`}
            className="font-semibold text-brand hover:underline"
          >
            {cat.title}
          </Link>
          <p className="mt-0.5 text-[11px] text-[#888]">
            <code>{cat.slug}</code>
          </p>
        </>
      ),
    },
    {
      key: "kind",
      header: "Loại",
      cell: (cat) => cat.kind,
    },
    {
      key: "articles",
      header: "Bài",
      cell: (cat) => cat.article_count,
    },
    {
      key: "subs",
      header: "Sub",
      cell: (cat) => cat.subcategory_count,
    },
    {
      key: "sort",
      header: "Sort",
      cell: (cat) => cat.sort_order,
    },
    {
      key: "actions",
      header: "Thao tác",
      cell: (cat) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/categories/${cat.slug}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <button
            type="button"
            disabled={busySlug === cat.slug}
            onClick={() => onDelete(cat)}
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
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Tên hoặc slug…"
            className="w-full rounded border border-border-light px-3 py-2 text-[14px] outline-none focus:border-brand"
          />
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-medium text-[#666]">
            Loại
          </span>
          <select
            value={kind}
            onChange={(e) =>
              setFilter("kind", e.target.value === "all" ? null : e.target.value)
            }
            className="rounded border border-border-light px-3 py-2 text-[14px] outline-none focus:border-brand"
          >
            <option value="all">Tất cả</option>
            <option value="archive">Archive</option>
            <option value="subcategory">Subcategory</option>
          </select>
        </label>
        <Link
          href="/admin/categories/new"
          className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white"
        >
          + Category
        </Link>
      </div>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={categories}
        rowKey={(row) => row.slug}
        emptyMessage="Chưa có category"
        loading={pending}
      />
      <AdminPagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <p className="text-[13px] text-[#666]">
        Glossary quản lý tại{" "}
        <Link href="/admin/glossary" className="text-brand hover:underline">
          /admin/glossary
        </Link>
        .
      </p>
    </div>
  );
}
