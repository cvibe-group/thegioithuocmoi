"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import type { AdminAuthor } from "@/lib/admin/author-queries";
import type { AdminTableColumn } from "@/lib/admin/pagination";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function AuthorsTable({
  authors,
  total,
}: {
  authors: AdminAuthor[];
  total: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const { page, pageSize, q, setPage, setPageSize, setParams } =
    useAdminPagination();
  const [draftQ, setDraftQ] = useState(q);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  async function onDelete(author: AdminAuthor) {
    setError(null);
    const ok = await confirm({
      title: `Xóa tác giả “${author.name}”?`,
      description:
        author.article_count > 0
          ? `Tác giả đang gắn với ${author.article_count} bài — sẽ gỡ liên kết, không xóa bài viết.`
          : "Thao tác này không thể hoàn tác.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(author.id);
    try {
      const supabase = createAuthBrowserClient();
      await supabase.from("article_authors").delete().eq("author_id", author.id);
      const { error: deleteError } = await supabase
        .from("authors")
        .delete()
        .eq("id", author.id);
      if (deleteError) throw new Error(deleteError.message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setBusyId(null);
    }
  }

  const columns: AdminTableColumn<AdminAuthor>[] = [
    {
      key: "name",
      header: "Tác giả",
      cell: (author) => (
        <div className="flex items-center gap-3">
          {author.image ? (
            <Image
              src={author.image}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
              {author.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <Link
              href={`/admin/authors/${author.id}`}
              className="font-semibold text-brand hover:underline"
            >
              {author.name}
            </Link>
            <p className="mt-0.5 text-[11px] text-[#888]">
              <code>{author.slug}</code>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "articles",
      header: "Bài",
      cell: (author) => author.article_count,
    },
    {
      key: "sort",
      header: "Sort",
      cell: (author) => author.sort_order,
    },
    {
      key: "actions",
      header: "Thao tác",
      cell: (author) => (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/authors/${author.id}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <button
            type="button"
            disabled={busyId === author.id}
            onClick={() => onDelete(author)}
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
        <Link
          href="/admin/authors/new"
          className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white"
        >
          + Tác giả
        </Link>
      </div>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <AdminDataTable
        columns={columns}
        rows={authors}
        rowKey={(row) => row.id}
        emptyMessage="Chưa có tác giả"
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
