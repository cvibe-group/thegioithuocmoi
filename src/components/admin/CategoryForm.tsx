"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { CategoryArticlesTable } from "@/components/admin/CategoryArticlesTable";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useAdminPagination } from "@/hooks/useAdminPagination";
import { slugify } from "@/lib/admin/articles";
import type {
  AdminCategory,
  CategoryArticleLink,
} from "@/lib/admin/category-queries";
import type { AdminTableColumn } from "@/lib/admin/pagination";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function CategoryForm({
  mode,
  initial,
  createParents,
  subcategories,
  subTotal,
  articles,
  articlesTotal,
}: {
  mode: "create" | "edit";
  initial?: AdminCategory | null;
  createParents: Array<{ slug: string; title: string }>;
  subcategories?: AdminCategory[];
  subTotal?: number;
  articles?: CategoryArticleLink[];
  articlesTotal?: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const subPager = useAdminPagination();

  const [kind, setKind] = useState<"archive" | "subcategory">(
    initial?.kind === "subcategory" ? "subcategory" : "archive",
  );
  const [parentSlug, setParentSlug] = useState(
    initial?.parent_slug ?? createParents[0]?.slug ?? "thuoc",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [totalPages, setTotalPages] = useState(initial?.total_pages ?? 1);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [addToMenu, setAddToMenu] = useState(true);
  const [addHomepageSection, setAddHomepageSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSlug =
    mode === "edit" && initial
      ? initial.slug
      : kind === "archive"
        ? slugify(title)
        : parentSlug && slugify(title)
          ? `${parentSlug}/${slugify(title)}`
          : "";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên category.");
      return;
    }
    if (mode === "create" && !createSlug) {
      setError("Không tạo được slug.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createAuthBrowserClient();
      if (mode === "create") {
        const { error: insertError } = await supabase.from("categories").insert({
          slug: createSlug,
          title: trimmed,
          kind,
          parent_slug: kind === "subcategory" ? parentSlug : null,
          total_pages: Math.max(1, Math.floor(totalPages)),
          sort_order: Math.floor(sortOrder),
        });
        if (insertError) throw new Error(insertError.message);

        if (addToMenu) {
          const href = `/${createSlug}`;
          if (kind === "archive") {
            const { data: navItems } = await supabase
              .from("nav_items")
              .select("href, sort_order");
            if (!(navItems ?? []).some((i) => i.href === href)) {
              const max = (navItems ?? []).reduce(
                (a, i) => Math.max(a, i.sort_order as number),
                0,
              );
              await supabase.from("nav_items").insert({
                label: trimmed,
                href,
                has_dropdown: false,
                sort_order: max + 1,
              });
            }
          } else {
            const { data: parentNav } = await supabase
              .from("nav_items")
              .select("id, has_dropdown")
              .eq("href", `/${parentSlug}`)
              .maybeSingle();
            if (parentNav) {
              if (!parentNav.has_dropdown) {
                await supabase
                  .from("nav_items")
                  .update({ has_dropdown: true })
                  .eq("id", parentNav.id);
              }
              const { data: existing } = await supabase
                .from("nav_dropdown_items")
                .select("id")
                .eq("nav_item_id", parentNav.id)
                .eq("href", href)
                .maybeSingle();
              if (!existing) {
                const { data: siblings } = await supabase
                  .from("nav_dropdown_items")
                  .select("sort_order")
                  .eq("nav_item_id", parentNav.id);
                const max = (siblings ?? []).reduce(
                  (a, i) => Math.max(a, i.sort_order as number),
                  0,
                );
                await supabase.from("nav_dropdown_items").insert({
                  nav_item_id: parentNav.id,
                  text: trimmed,
                  href,
                  sort_order: max + 1,
                });
              }
            }
          }
        }

        if (addHomepageSection && kind === "archive") {
          const { data: existing } = await supabase
            .from("homepage_sections")
            .select("id")
            .eq("id", createSlug)
            .maybeSingle();
          if (!existing) {
            const { data: sections } = await supabase
              .from("homepage_sections")
              .select("sort_order");
            const max = (sections ?? []).reduce(
              (a, i) => Math.max(a, i.sort_order as number),
              0,
            );
            await supabase.from("homepage_sections").insert({
              id: createSlug,
              title: trimmed,
              see_more_href: `/${createSlug}`,
              sort_order: max + 1,
            });
          }
        }

        router.replace(`/admin/categories/${createSlug}`);
        router.refresh();
        return;
      }

      if (!initial) throw new Error("Thiếu category");
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          title: trimmed,
          total_pages: Math.max(1, Math.floor(totalPages)),
          sort_order: Math.floor(sortOrder),
        })
        .eq("slug", initial.slug);
      if (updateError) throw new Error(updateError.message);

      const href = `/${initial.slug}`;
      await supabase
        .from("articles")
        .update({ category_label: trimmed })
        .eq("category_href", href);
      await supabase.from("nav_items").update({ label: trimmed }).eq("href", href);
      await supabase
        .from("nav_dropdown_items")
        .update({ text: trimmed })
        .eq("href", href);
      await supabase
        .from("homepage_sections")
        .update({ title: trimmed })
        .eq("id", initial.slug);

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (initial.article_count > 0) {
      setError(`Không thể xóa. Còn ${initial.article_count} bài viết.`);
      return;
    }
    if (initial.subcategory_count > 0) {
      setError(`Không thể xóa. Còn ${initial.subcategory_count} subcategory.`);
      return;
    }
    const ok = await confirm({
      title: `Xóa “${initial.title}”?`,
      description: "Không thể hoàn tác.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const href = `/${initial.slug}`;
    await supabase.from("nav_dropdown_items").delete().eq("href", href);
    await supabase.from("nav_items").delete().eq("href", href);
    await supabase.from("homepage_sections").delete().eq("id", initial.slug);
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("slug", initial.slug);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/admin/categories");
    router.refresh();
  }

  const subPage = Number(subPager.searchParams.get("subPage") ?? "1") || 1;
  const subPageSize =
    Number(subPager.searchParams.get("subPageSize") ?? "25") || 25;

  const subColumns: AdminTableColumn<AdminCategory>[] = [
    {
      key: "title",
      header: "Subcategory",
      cell: (cat) => (
        <Link
          href={`/admin/categories/${cat.slug}`}
          className="font-medium text-brand hover:underline"
        >
          {cat.title}
        </Link>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      cell: (cat) => <code className="text-[11px]">{cat.slug}</code>,
    },
    {
      key: "articles",
      header: "Bài",
      cell: (cat) => cat.article_count,
    },
    {
      key: "actions",
      header: "",
      cell: (cat) => (
        <Link
          href={`/admin/categories/${cat.slug}`}
          className="text-brand hover:underline"
        >
          Sửa
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {dialog}
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-border-light bg-white p-4"
      >
        <h2 className="text-[16px] font-bold">
          {mode === "create" ? "Tạo category" : "Sửa category"}
        </h2>

        {mode === "create" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Loại
              </span>
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "archive" | "subcategory")
                }
                className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
              >
                <option value="archive">Archive</option>
                <option value="subcategory">Subcategory</option>
              </select>
            </label>
            {kind === "subcategory" ? (
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#666]">
                  Parent
                </span>
                <select
                  value={parentSlug}
                  onChange={(e) => setParentSlug(e.target.value)}
                  className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
                >
                  {createParents.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : (
          <p className="text-[12px] text-[#666]">
            slug: <code>{initial?.slug}</code> · kind:{" "}
            <strong>{initial?.kind}</strong>
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#666]">
            Tên
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
            required
          />
          {mode === "create" ? (
            <p className="mt-1 text-[12px] text-[#666]">
              slug: <code>{createSlug || "-"}</code>
            </p>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#666]">
              Total pages
            </span>
            <input
              type="number"
              min={1}
              value={totalPages}
              onChange={(e) => setTotalPages(Number(e.target.value))}
              className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#666]">
              Sort order
            </span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
            />
          </label>
        </div>

        {mode === "create" ? (
          <div className="space-y-2 rounded border border-border-light bg-[#faf5ff] p-3">
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={addToMenu}
                onChange={(e) => setAddToMenu(e.target.checked)}
                className="mt-0.5"
              />
              Thêm vào menu
            </label>
            {kind === "archive" ? (
              <label className="flex items-start gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={addHomepageSection}
                  onChange={(e) => setAddHomepageSection(e.target.checked)}
                  className="mt-0.5"
                />
                Tạo section homepage
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : mode === "create" ? "Tạo" : "Lưu"}
          </button>
          <Link
            href="/admin/categories"
            className="rounded border border-border-light px-4 py-2 text-[13px] font-medium hover:bg-brand-light"
          >
            Quay lại
          </Link>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => onDelete()}
              className="rounded border border-border-light px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50"
            >
              Xóa
            </button>
          ) : null}
        </div>
        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      </form>

      {mode === "edit" && initial?.kind === "archive" ? (
        <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-bold">Subcategories</h3>
            <Link
              href="/admin/categories/new"
              className="text-[13px] font-medium text-brand hover:underline"
            >
              + Subcategory
            </Link>
          </div>
          <AdminDataTable
            columns={subColumns}
            rows={subcategories ?? []}
            rowKey={(row) => row.slug}
            emptyMessage="Chưa có subcategory"
          />
          <AdminPagination
            page={subPage}
            pageSize={subPageSize}
            total={subTotal ?? 0}
            onPageChange={(p) =>
              subPager.setParams({ subPage: String(p) })
            }
            onPageSizeChange={(s) =>
              subPager.setParams({
                subPageSize: String(s),
                subPage: "1",
              })
            }
          />
        </div>
      ) : null}

      {mode === "edit" && initial ? (
        <CategoryArticlesTable
          category={initial}
          initialLinks={articles ?? []}
          total={articlesTotal ?? 0}
          paramPrefix="art"
        />
      ) : null}
    </div>
  );
}
