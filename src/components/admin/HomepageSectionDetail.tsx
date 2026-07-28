"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  ADMIN_DEFAULT_PAGE_SIZE,
  paginationRange,
  type AdminPageSize,
  type AdminTableColumn,
} from "@/lib/admin/pagination";
import type {
  AdminHomepageLink,
  AdminHomepageSection,
  ArticleOption,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function HomepageSectionDetail({
  section: initial,
  links: initialLinks,
  articles,
}: {
  section: AdminHomepageSection;
  links: AdminHomepageLink[];
  articles: ArticleOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [section, setSection] = useState(initial);
  const [links, setLinks] = useState(initialLinks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);

  const sorted = useMemo(
    () => [...links].sort((a, b) => a.sort_order - b.sort_order),
    [links],
  );
  const { startIndex, endIndex, page: safePage } = paginationRange(
    page,
    pageSize,
    sorted.length,
  );
  const rows = sorted.slice(startIndex, endIndex);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const { error: sectionError } = await supabase
        .from("homepage_sections")
        .update({
          title: section.title,
          see_more_href: section.see_more_href,
          sort_order: section.sort_order,
        })
        .eq("id", section.id);
      if (sectionError) throw new Error(sectionError.message);

      await supabase
        .from("homepage_section_articles")
        .delete()
        .eq("section_id", section.id);

      if (sorted.length) {
        const { error: insertError } = await supabase
          .from("homepage_section_articles")
          .insert(
            sorted.map((link, sort_order) => ({
              section_id: section.id,
              article_path: link.article_path,
              sort_order,
            })),
          );
        if (insertError) throw new Error(insertError.message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  function addLink() {
    const first = articles[0]?.path ?? "";
    setLinks((prev) => [
      ...prev,
      {
        section_id: section.id,
        article_path: first,
        sort_order: prev.length,
      },
    ]);
  }

  async function removeLink(path: string) {
    const ok = await confirm({
      title: "Gỡ bài khỏi section?",
      description: "Nhớ bấm Lưu để ghi nhận.",
      confirmLabel: "Gỡ",
      tone: "danger",
    });
    if (!ok) return;
    setLinks((prev) => prev.filter((l) => l.article_path !== path));
  }

  const columns: AdminTableColumn<AdminHomepageLink>[] = [
    {
      key: "article",
      header: "Bài viết",
      cell: (link) => (
        <select
          value={link.article_path}
          onChange={(e) =>
            setLinks((prev) =>
              prev.map((row) =>
                row.article_path === link.article_path &&
                row.sort_order === link.sort_order
                  ? { ...row, article_path: e.target.value }
                  : row,
              ),
            )
          }
          className="w-full max-w-md rounded border border-border-light px-2 py-1 text-[13px]"
        >
          {articles.map((a) => (
            <option key={a.path} value={a.path}>
              {a.title}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (link) => (
        <button
          type="button"
          onClick={() => removeLink(link.article_path)}
          className="text-red-600 hover:underline"
        >
          Gỡ
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {dialog}
      <form
        onSubmit={onSave}
        className="space-y-4 rounded-lg border border-border-light bg-white p-4"
      >
        <h2 className="text-[16px] font-bold">Sửa section</h2>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Title</span>
          <input
            value={section.title}
            onChange={(e) => setSection({ ...section, title: e.target.value })}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">See more href</span>
          <input
            value={section.see_more_href}
            onChange={(e) =>
              setSection({ ...section, see_more_href: e.target.value })
            }
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Sort order</span>
          <input
            type="number"
            value={section.sort_order}
            onChange={(e) =>
              setSection({ ...section, sort_order: Number(e.target.value) })
            }
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
          <Link
            href="/admin/homepage"
            className="rounded border border-border-light px-4 py-2 text-[13px]"
          >
            Quay lại
          </Link>
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Articles in section</h3>
          <button
            type="button"
            onClick={() => addLink()}
            className="rounded border border-border-light px-3 py-1.5 text-[13px]"
          >
            + Bài
          </button>
        </div>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => `${row.section_id}-${row.article_path}-${row.sort_order}`}
          emptyMessage="Chưa có bài"
        />
        <AdminPagination
          page={safePage}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
