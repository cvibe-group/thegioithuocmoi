"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  AdminHomepageSection,
  ArticleOption,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function HomepageOverview({
  featuredPath: initialFeatured,
  secondaryPaths: initialSecondary,
  sections: initialSections,
  articles,
}: {
  featuredPath: string;
  secondaryPaths: string[];
  sections: AdminHomepageSection[];
  articles: ArticleOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [featuredPath, setFeaturedPath] = useState(initialFeatured);
  const [secondaryPaths, setSecondaryPaths] = useState(initialSecondary);
  const [sections, setSections] = useState(initialSections);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections],
  );
  const { startIndex, endIndex, page: safePage } = paginationRange(
    page,
    pageSize,
    sorted.length,
  );
  const rows = sorted.slice(startIndex, endIndex);

  async function saveFeatured() {
    setSaving(true);
    setError(null);
    const supabase = createAuthBrowserClient();
    const { error: e1 } = await supabase.from("site_settings").upsert({
      key: "featured_article_path",
      value: featuredPath,
      updated_at: new Date().toISOString(),
    });
    if (e1) {
      setError(e1.message);
      setSaving(false);
      return;
    }
    const { error: e2 } = await supabase.from("site_settings").upsert({
      key: "secondary_news_paths",
      value: secondaryPaths.filter(Boolean),
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (e2) {
      setError(e2.message);
      return;
    }
    router.refresh();
  }

  async function addSection() {
    const id = `section-${Date.now()}`;
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("homepage_sections")
      .insert({
        id,
        title: "Section mới",
        see_more_href: "/",
        sort_order: sections.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/admin/homepage/sections/${data.id}`);
    router.refresh();
  }

  async function removeSection(section: AdminHomepageSection) {
    const ok = await confirm({
      title: "Xóa section?",
      description: "Các bài gắn section cũng sẽ bị gỡ.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("homepage_sections")
      .delete()
      .eq("id", section.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== section.id));
    router.refresh();
  }

  const columns: AdminTableColumn<AdminHomepageSection>[] = [
    {
      key: "title",
      header: "Section",
      cell: (section) => (
        <Link
          href={`/admin/homepage/sections/${section.id}`}
          className="font-semibold text-brand hover:underline"
        >
          {section.title}
        </Link>
      ),
    },
    { key: "href", header: "See more", cell: (s) => s.see_more_href },
    { key: "sort", header: "Sort", cell: (s) => s.sort_order },
    {
      key: "actions",
      header: "Thao tác",
      cell: (section) => (
        <div className="flex gap-2">
          <Link
            href={`/admin/homepage/sections/${section.id}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <button
            type="button"
            onClick={() => removeSection(section)}
            className="text-red-600 hover:underline"
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {dialog}
      <section className="space-y-3 rounded-lg border border-border-light bg-white p-4">
        <h2 className="text-[15px] font-bold">Featured & Secondary</h2>
        <label className="block">
          <span className="mb-1 block text-[12px] text-[#666]">Featured</span>
          <select
            value={featuredPath}
            onChange={(e) => setFeaturedPath(e.target.value)}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          >
            <option value="">—</option>
            {articles.map((a) => (
              <option key={a.path} value={a.path}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2">
          {secondaryPaths.map((path, index) => (
            <select
              key={`sec-${index}`}
              value={path}
              onChange={(e) =>
                setSecondaryPaths((prev) =>
                  prev.map((row, i) => (i === index ? e.target.value : row)),
                )
              }
              className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
            >
              <option value="">—</option>
              {articles.map((a) => (
                <option key={a.path} value={a.path}>
                  {a.title}
                </option>
              ))}
            </select>
          ))}
          <button
            type="button"
            onClick={() => setSecondaryPaths((prev) => [...prev, ""])}
            className="text-[13px] text-brand hover:underline"
          >
            + Secondary
          </button>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => saveFeatured()}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu featured / secondary"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Sections</h2>
          <button
            type="button"
            onClick={() => addSection()}
            className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white"
          >
            + Section
          </button>
        </div>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="Chưa có section"
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
      </section>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
