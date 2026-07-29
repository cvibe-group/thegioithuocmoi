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
  AdminHomepageCategoryOption,
  AdminHomepageSection,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function HomepageOverview({
  sections: initialSections,
  categories,
}: {
  sections: AdminHomepageSection[];
  categories: AdminHomepageCategoryOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [sections, setSections] = useState(initialSections);
  const [selectedSlug, setSelectedSlug] = useState("");
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

  const availableCategories = useMemo(() => {
    const used = new Set(sections.map((s) => s.id));
    return categories.filter((c) => !used.has(c.slug));
  }, [categories, sections]);

  async function addSection() {
    if (!selectedSlug) {
      setError("Chọn category để thêm section");
      return;
    }
    const category = categories.find((c) => c.slug === selectedSlug);
    if (!category) {
      setError("Category không hợp lệ");
      return;
    }
    setError(null);
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("homepage_sections")
      .insert({
        id: category.slug,
        title: category.title,
        see_more_href: `/${category.slug}`,
        sort_order: sections.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSections((prev) => [...prev, data as AdminHomepageSection]);
    setSelectedSlug("");
    router.refresh();
  }

  async function removeSection(section: AdminHomepageSection) {
    const ok = await confirm({
      title: "Xóa section?",
      description: "Section sẽ biến mất khỏi trang chủ. Bài viết trong category không bị xóa.",
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
    { key: "category", header: "Category", cell: (s) => s.id },
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
      <section className="rounded-lg border border-border-light bg-white p-4 text-[13px] text-[#555]">
        <p>
          Featured = bài mới nhất; Secondary = 3 bài mới nhất tiếp theo. Mỗi
          section hiển thị 6 bài mới nhất của category tương ứng.
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[15px] font-bold">Sections</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="min-w-[220px] rounded border border-border-light px-3 py-2 text-[13px]"
            >
              <option value="">— Chọn category —</option>
              {availableCategories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => addSection()}
              disabled={!selectedSlug}
              className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              + Section
            </button>
          </div>
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
