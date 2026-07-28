"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import type { AdminCategory, CategoryArticleLink } from "@/lib/admin/category-queries";
import type { AdminGlossaryTab } from "@/lib/admin/structure-queries";
import { slugify } from "@/lib/admin/articles";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import { CategoryArticlesTable } from "@/components/admin/CategoryArticlesTable";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";

export function GlossaryEditor({
  tabs: initialTabs,
  activeTab,
  activeCategory,
  initialLinks,
  linksTotal,
}: {
  tabs: AdminGlossaryTab[];
  activeTab: string;
  activeCategory: AdminCategory | null;
  initialLinks: CategoryArticleLink[];
  linksTotal: number;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const [tabs, setTabs] = useState(initialTabs);
  const [error, setError] = useState<string | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createSortOrder, setCreateSortOrder] = useState(0);
  const [addToMenu, setAddToMenu] = useState(true);
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<AdminGlossaryTab | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    setTabs(initialTabs);
  }, [initialTabs]);

  const createSlug = useMemo(() => slugify(createTitle), [createTitle]);

  useEffect(() => {
    const max = tabs.reduce((acc, cur) => Math.max(acc, cur.sort_order), 0);
    setCreateSortOrder(max + 1);
  }, [tabs]);

  useEffect(() => {
    if (!editing) return;
    setEditTitle(editing.title);
    setEditSortOrder(editing.sort_order);
  }, [editing]);

  async function onCreateCategory(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const title = createTitle.trim();
    if (!title) {
      setError("Vui lòng nhập tên glossary.");
      return;
    }
    const slug = createSlug;
    if (!slug) {
      setError("Không tạo được slug từ title.");
      return;
    }

    setCreating(true);
    try {
      const supabase = createAuthBrowserClient();
      const { error: insertError } = await supabase.from("categories").insert({
        slug,
        title,
        kind: "glossary",
        parent_slug: null,
        total_pages: 1,
        sort_order: Math.floor(createSortOrder),
      });
      if (insertError) throw new Error(insertError.message);

      if (addToMenu) {
        const href = `/${slug}`;
        const { data: navItems } = await supabase
          .from("nav_items")
          .select("id, href, sort_order");
        if (!(navItems ?? []).some((item) => item.href === href)) {
          const max = (navItems ?? []).reduce(
            (acc, item) => Math.max(acc, item.sort_order as number),
            0,
          );
          const { error: navError } = await supabase.from("nav_items").insert({
            label: title,
            href,
            has_dropdown: false,
            sort_order: max + 1,
          });
          if (navError) throw new Error(navError.message);
        }
      }

      setCreateTitle("");
      router.replace(`/admin/glossary?tab=${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo glossary thất bại");
    } finally {
      setCreating(false);
    }
  }

  async function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setError(null);
    const title = editTitle.trim();
    if (!title) {
      setError("Vui lòng nhập tên glossary.");
      return;
    }

    setSavingEdit(true);
    try {
      const supabase = createAuthBrowserClient();
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          title,
          sort_order: Math.floor(editSortOrder),
        })
        .eq("slug", editing.slug)
        .eq("kind", "glossary");
      if (updateError) throw new Error(updateError.message);

      const href = `/${editing.slug}`;
      await supabase.from("articles").update({ category_label: title }).eq(
        "category_href",
        href,
      );
      await supabase.from("nav_items").update({ label: title }).eq("href", href);

      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSavingEdit(false);
    }
  }

  async function onDeleteCategory(tab: AdminGlossaryTab) {
    setError(null);
    setDeletingSlug(tab.slug);
    try {
      if (tab.article_count > 0) {
        setError(`Không thể xóa. Glossary này còn ${tab.article_count} bài viết.`);
        return;
      }

      const ok = await confirm({
        title: `Xóa glossary “${tab.title}”?`,
        description: "Mục menu trỏ tới glossary này (nếu có) cũng sẽ được gỡ.",
        confirmLabel: "Xóa",
        tone: "danger",
      });
      if (!ok) return;

      const supabase = createAuthBrowserClient();
      const href = `/${tab.slug}`;
      await supabase.from("nav_items").delete().eq("href", href);
      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("slug", tab.slug)
        .eq("kind", "glossary");
      if (deleteError) throw new Error(deleteError.message);

      const next = tabs.find((t) => t.slug !== tab.slug);
      router.replace(next ? `/admin/glossary?tab=${next.slug}` : "/admin/glossary");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <div className="space-y-6">
      {dialog}

      <div className="flex flex-wrap items-center gap-2 border-b border-border-light pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.slug}
            href={`/admin/glossary?tab=${tab.slug}`}
            className={`rounded px-3 py-1.5 text-[13px] font-medium ${
              tab.slug === activeTab
                ? "bg-brand text-white"
                : "border border-border-light text-[#444]"
            }`}
          >
            {tab.title}
            <span className="ml-1.5 opacity-80">({tab.article_count})</span>
          </Link>
        ))}
        {tabs.length === 0 ? (
          <p className="text-[13px] text-[#666]">Chưa có category glossary.</p>
        ) : null}
      </div>

      {activeCategory ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold">{activeCategory.title}</p>
            <p className="text-[12px] text-[#666]">
              slug: <code>{activeCategory.slug}</code> · URL:{" "}
              <code>/{activeCategory.slug}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setEditing({
                  slug: activeCategory.slug,
                  title: activeCategory.title,
                  sort_order: activeCategory.sort_order,
                  article_count: activeCategory.article_count,
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-border-light px-3 py-1.5 text-[13px] font-medium hover:bg-brand-light"
            >
              <Pencil className="size-3.5" />
              Sửa
            </button>
            <button
              type="button"
              disabled={deletingSlug === activeCategory.slug}
              onClick={() =>
                onDeleteCategory({
                  slug: activeCategory.slug,
                  title: activeCategory.title,
                  sort_order: activeCategory.sort_order,
                  article_count: activeCategory.article_count,
                })
              }
              className="inline-flex items-center gap-1.5 rounded border border-border-light px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
              Xóa
            </button>
          </div>
        </div>
      ) : null}

      {activeCategory ? (
        <CategoryArticlesTable
          key={activeCategory.slug}
          category={activeCategory}
          initialLinks={initialLinks}
          total={linksTotal}
          hideLayout
        />
      ) : (
        <p className="text-[13px] text-[#666]">
          Chọn hoặc tạo một glossary category để gắn bài viết.
        </p>
      )}

      <div className="rounded-lg border border-border-light bg-white p-4">
        <h3 className="mb-3 text-[15px] font-bold">Tạo glossary category</h3>
        <form onSubmit={onCreateCategory} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#666]">
              Tên
            </span>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="vd: Dược lý"
              className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
              required
            />
            <p className="mt-1 text-[12px] text-[#666]">
              slug: <code>{createSlug || "-"}</code>
            </p>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#666]">
              Sort order
            </span>
            <input
              type="number"
              value={createSortOrder}
              onChange={(e) => setCreateSortOrder(Number(e.target.value))}
              className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-start gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={addToMenu}
              onChange={(e) => setAddToMenu(e.target.checked)}
              className="mt-0.5"
            />
            <span>Thêm vào menu navigation</span>
          </label>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
          >
            <FolderPlus className="size-4" />
            {creating ? "Đang tạo..." : "Tạo glossary"}
          </button>
        </form>
      </div>

      {editing ? (
        <div className="rounded-lg border border-border-light bg-white p-4">
          <h3 className="mb-3 text-[15px] font-bold">Sửa glossary</h3>
          <form onSubmit={onSaveEdit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Title
              </span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
                required
              />
            </label>
            <p className="text-[12px] text-[#666]">
              slug: <code>{editing.slug}</code> (không đổi)
            </p>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Sort order
              </span>
              <input
                type="number"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(Number(e.target.value))}
                className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={savingEdit}
                className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {savingEdit ? "Đang lưu..." : "Lưu"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded border border-border-light px-4 py-2 text-[13px] font-medium hover:bg-brand-light"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
