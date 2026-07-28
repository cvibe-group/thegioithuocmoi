"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import type {
  AdminCategory,
  CategoryArticleLink,
} from "@/lib/admin/category-queries";
import { slugify } from "@/lib/admin/articles";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { CategoryArticlesPanel } from "@/components/admin/CategoryArticlesPanel";
import { FileText, Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";

type CreateParentOption = { slug: string; title: string };

export function CategoriesManager({
  initialCategories,
  createParents,
}: {
  initialCategories: AdminCategory[];
  createParents: CreateParentOption[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTotalPages, setEditTotalPages] = useState(1);
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const [createParentSlug, setCreateParentSlug] = useState(
    createParents[0]?.slug ?? "thuoc",
  );
  const [createKind, setCreateKind] = useState<"archive" | "subcategory">(
    "subcategory",
  );
  const [createTitle, setCreateTitle] = useState("");
  const [createTotalPages, setCreateTotalPages] = useState(1);
  const [createSortOrder, setCreateSortOrder] = useState(0);
  const [addToMenu, setAddToMenu] = useState(true);
  const [addHomepageSection, setAddHomepageSection] = useState(false);
  const [creating, setCreating] = useState(false);

  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const [managingArticles, setManagingArticles] = useState<AdminCategory | null>(
    null,
  );
  const [articleLinks, setArticleLinks] = useState<CategoryArticleLink[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    if (!editing) return;
    setEditTitle(editing.title);
    setEditTotalPages(editing.total_pages);
    setEditSortOrder(editing.sort_order);
  }, [editing]);

  const allowedCreateParents = useMemo(
    () => createParents.map((p) => p.slug).filter(Boolean) as string[],
    [createParents],
  );

  useEffect(() => {
    if (!allowedCreateParents.includes(createParentSlug)) {
      setCreateParentSlug(allowedCreateParents[0] ?? "thuoc");
    }
  }, [allowedCreateParents, createParentSlug]);

  const createSlug = useMemo(() => {
    const slugPart = slugify(createTitle);
    if (!slugPart) return "";
    if (createKind === "archive") return slugPart;
    if (!createParentSlug) return "";
    return `${createParentSlug}/${slugPart}`;
  }, [createKind, createParentSlug, createTitle]);

  useEffect(() => {
    if (createKind === "archive") {
      const archiveItems = categories.filter((c) => c.kind === "archive");
      const max = archiveItems.reduce(
        (acc, cur) => Math.max(acc, cur.sort_order),
        0,
      );
      setCreateSortOrder(max + 1);
      return;
    }

    const parentSubcats = categories.filter(
      (c) => c.kind === "subcategory" && c.parent_slug === createParentSlug,
    );
    const max = parentSubcats.reduce(
      (acc, cur) => Math.max(acc, cur.sort_order),
      0,
    );
    setCreateSortOrder(max + 1);
  }, [createKind, createParentSlug, categories]);

  const archiveGroups = useMemo(() => {
    const archives = categories
      .filter((c) => c.kind === "archive")
      .sort((a, b) => a.sort_order - b.sort_order);

    const subcats = categories.filter((c) => c.kind === "subcategory");
    const byParent = new Map<string, AdminCategory[]>();
    for (const sc of subcats) {
      const key = sc.parent_slug ?? "";
      const list = byParent.get(key) ?? [];
      list.push(sc);
      byParent.set(key, list);
    }
    for (const list of byParent.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order);
    }

    return { archives, byParent };
  }, [categories]);

  async function loadCategoryArticles(cat: AdminCategory) {
    setLoadingArticles(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const { data: links, error: linkError } = await supabase
        .from("category_articles")
        .select("article_path, sort_order, layout")
        .eq("category_slug", cat.slug)
        .order("sort_order", { ascending: true });
      if (linkError) throw new Error(linkError.message);

      const rows = links ?? [];
      if (rows.length === 0) {
        setArticleLinks([]);
        setManagingArticles(cat);
        return;
      }

      const paths = rows.map((row) => row.article_path as string);
      const articles: Array<{
        path: string;
        title: string;
        is_published: boolean;
        category_label: string;
      }> = [];
      const chunkSize = 80;
      for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize);
        const { data, error: articleError } = await supabase
          .from("articles")
          .select("path, title, is_published, category_label")
          .in("path", chunk);
        if (articleError) throw new Error(articleError.message);
        articles.push(
          ...((data ?? []) as Array<{
            path: string;
            title: string;
            is_published: boolean;
            category_label: string;
          }>),
        );
      }

      const byPath = new Map(articles.map((row) => [row.path, row]));
      setArticleLinks(
        rows.map((row) => {
          const article = byPath.get(row.article_path as string);
          return {
            article_path: row.article_path as string,
            sort_order: row.sort_order as number,
            layout: (row.layout as CategoryArticleLink["layout"]) ?? null,
            title: article?.title ?? (row.article_path as string),
            is_published: article?.is_published ?? false,
            category_label: article?.category_label ?? "",
          };
        }),
      );
      setManagingArticles(cat);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách bài");
    } finally {
      setLoadingArticles(false);
    }
  }

  async function addArchiveToMenu(opts: {
    title: string;
    slug: string;
  }) {
    const supabase = createAuthBrowserClient();
    const { data: navItems } = await supabase
      .from("nav_items")
      .select("id, href, sort_order");
    const href = `/${opts.slug}`;
    if ((navItems ?? []).some((item) => item.href === href)) return;

    const max = (navItems ?? []).reduce(
      (acc, item) => Math.max(acc, item.sort_order as number),
      0,
    );
    const { error: navError } = await supabase.from("nav_items").insert({
      label: opts.title,
      href,
      has_dropdown: false,
      sort_order: max + 1,
    });
    if (navError) throw new Error(navError.message);
  }

  async function addSubcategoryToMenu(opts: {
    title: string;
    slug: string;
    parentSlug: string;
  }) {
    const supabase = createAuthBrowserClient();
    const parentHref = `/${opts.parentSlug}`;
    const { data: parentNav, error: parentError } = await supabase
      .from("nav_items")
      .select("id, has_dropdown")
      .eq("href", parentHref)
      .maybeSingle();
    if (parentError) throw new Error(parentError.message);
    if (!parentNav) {
      throw new Error(
        `Không tìm thấy mục menu cho parent “${opts.parentSlug}”. Hãy thêm parent vào menu trước.`,
      );
    }

    if (!parentNav.has_dropdown) {
      const { error: flagError } = await supabase
        .from("nav_items")
        .update({ has_dropdown: true })
        .eq("id", parentNav.id);
      if (flagError) throw new Error(flagError.message);
    }

    const href = `/${opts.slug}`;
    const { data: existing } = await supabase
      .from("nav_dropdown_items")
      .select("id")
      .eq("nav_item_id", parentNav.id)
      .eq("href", href)
      .maybeSingle();
    if (existing) return;

    const { data: siblings } = await supabase
      .from("nav_dropdown_items")
      .select("sort_order")
      .eq("nav_item_id", parentNav.id);
    const max = (siblings ?? []).reduce(
      (acc, item) => Math.max(acc, item.sort_order as number),
      0,
    );

    const { error: dropError } = await supabase.from("nav_dropdown_items").insert({
      nav_item_id: parentNav.id,
      text: opts.title,
      href,
      sort_order: max + 1,
    });
    if (dropError) throw new Error(dropError.message);
  }

  async function addHomepageSectionForArchive(opts: {
    title: string;
    slug: string;
  }) {
    const supabase = createAuthBrowserClient();
    const id = opts.slug;
    const { data: existing } = await supabase
      .from("homepage_sections")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existing) return;

    const { data: sections } = await supabase
      .from("homepage_sections")
      .select("sort_order");
    const max = (sections ?? []).reduce(
      (acc, item) => Math.max(acc, item.sort_order as number),
      0,
    );

    const { error: sectionError } = await supabase.from("homepage_sections").insert({
      id,
      title: opts.title,
      see_more_href: `/${opts.slug}`,
      sort_order: max + 1,
    });
    if (sectionError) throw new Error(sectionError.message);
  }

  async function onCreateCategory(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const title = createTitle.trim();
    if (!title) {
      setError("Vui lòng nhập tên category.");
      return;
    }

    if (
      createKind === "subcategory" &&
      !allowedCreateParents.includes(createParentSlug)
    ) {
      setError("Parent cho tạo subcategory không hợp lệ.");
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
        kind: createKind,
        parent_slug: createKind === "subcategory" ? createParentSlug : null,
        total_pages: Math.max(1, Math.floor(createTotalPages)),
        sort_order: Math.floor(createSortOrder),
      });

      if (insertError) throw new Error(insertError.message);

      if (addToMenu) {
        if (createKind === "archive") {
          await addArchiveToMenu({ title, slug });
        } else {
          await addSubcategoryToMenu({
            title,
            slug,
            parentSlug: createParentSlug,
          });
        }
      }

      if (addHomepageSection && createKind === "archive") {
        await addHomepageSectionForArchive({ title, slug });
      }

      router.refresh();
      setCreateTitle("");
      setCreateTotalPages(1);
      setAddHomepageSection(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo category thất bại");
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
      setError("Vui lòng nhập tên category.");
      return;
    }

    setSavingEdit(true);
    try {
      const supabase = createAuthBrowserClient();
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          title,
          total_pages: Math.max(1, Math.floor(editTotalPages)),
          sort_order: Math.floor(editSortOrder),
        })
        .eq("slug", editing.slug);

      if (updateError) throw new Error(updateError.message);

      const categoryHref = `/${editing.slug}`;
      const { error: articleUpdateError } = await supabase
        .from("articles")
        .update({ category_label: title })
        .eq("category_href", categoryHref);
      if (articleUpdateError) throw new Error(articleUpdateError.message);

      // Đồng bộ label trên menu nếu có.
      await supabase
        .from("nav_items")
        .update({ label: title })
        .eq("href", categoryHref);
      await supabase
        .from("nav_dropdown_items")
        .update({ text: title })
        .eq("href", categoryHref);
      await supabase
        .from("homepage_sections")
        .update({ title })
        .eq("id", editing.slug);

      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thay đổi thất bại");
    } finally {
      setSavingEdit(false);
    }
  }

  async function onDeleteCategory(cat: AdminCategory) {
    setError(null);
    setDeletingSlug(cat.slug);
    try {
      const supabase = createAuthBrowserClient();

      const { count: articleCount } = await supabase
        .from("category_articles")
        .select("*", { count: "exact", head: true })
        .eq("category_slug", cat.slug);

      if ((articleCount ?? 0) > 0) {
        setError(`Không thể xóa. Category này còn ${articleCount} bài viết.`);
        return;
      }

      const { count: childCount } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true })
        .eq("parent_slug", cat.slug)
        .eq("kind", "subcategory");

      if ((childCount ?? 0) > 0) {
        setError(`Không thể xóa. Category này còn ${childCount} subcategory.`);
        return;
      }

      const ok = await confirm({
        title: `Xóa category “${cat.title}”?`,
        description:
          "Nếu xóa, mục menu / section homepage trỏ tới category này cũng sẽ được gỡ (nếu có).",
        confirmLabel: "Xóa",
        tone: "danger",
      });
      if (!ok) return;

      const href = `/${cat.slug}`;
      await supabase.from("nav_dropdown_items").delete().eq("href", href);
      await supabase.from("nav_items").delete().eq("href", href);
      await supabase.from("homepage_sections").delete().eq("id", cat.slug);

      const { error: deleteError } = await supabase
        .from("categories")
        .delete()
        .eq("slug", cat.slug);

      if (deleteError) throw new Error(deleteError.message);

      if (managingArticles?.slug === cat.slug) {
        setManagingArticles(null);
        setArticleLinks([]);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setDeletingSlug(null);
    }
  }

  function renderCategoryActions(cat: AdminCategory, compact = false) {
    const btnClass = compact
      ? "rounded border border-border-light px-2.5 py-1 text-[12px] font-medium hover:bg-white"
      : "rounded border border-border-light px-3 py-1.5 text-[13px] font-medium hover:bg-brand-light";
    const dangerClass = compact
      ? "rounded px-2.5 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      : "rounded border border-border-light bg-white px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

    return (
      <div className={`flex shrink-0 gap-2 ${compact ? "py-2" : ""}`}>
        <button
          type="button"
          disabled={loadingArticles}
          onClick={() => loadCategoryArticles(cat)}
          className={btnClass}
        >
          <span className="inline-flex items-center gap-1.5">
            {!compact ? <FileText className="size-4 text-[#666]" /> : null}
            Bài viết
          </span>
        </button>
        <button type="button" onClick={() => setEditing(cat)} className={btnClass}>
          {compact ? (
            "Sửa"
          ) : (
            <span className="inline-flex items-center gap-2">
              <Pencil className="size-4 text-[#666]" />
              Sửa
            </span>
          )}
        </button>
        <button
          type="button"
          disabled={deletingSlug === cat.slug}
          onClick={() => onDeleteCategory(cat)}
          className={dangerClass}
        >
          {compact ? (
            deletingSlug === cat.slug ? "Đang xóa..." : "Xóa"
          ) : (
            <span className="inline-flex items-center gap-2">
              <Trash2 className="size-4" />
              Xóa
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dialog}
      <div>
        <h2 className="mb-2 text-[18px] font-bold">Categories</h2>
        <p className="text-[14px] text-[#666]">
          Quản lý category (archive & subcategory), gắn bài viết, và tùy chọn thêm
          vào menu / homepage.
        </p>
        <p className="mt-2 text-[13px] text-[#666]">
          Glossary (Bệnh học, Thuật ngữ…) quản lý tại{" "}
          <a href="/admin/glossary" className="font-medium text-brand hover:underline">
            /admin/glossary
          </a>
          .
        </p>
      </div>

      {managingArticles ? (
        <CategoryArticlesPanel
          category={managingArticles}
          initialLinks={articleLinks}
          onClose={() => {
            setManagingArticles(null);
            setArticleLinks([]);
          }}
        />
      ) : null}

      <div className="rounded-lg border border-border-light bg-white p-4">
        <h3 className="mb-3 text-[15px] font-bold">Danh sách</h3>

        <div className="space-y-4">
          {archiveGroups.archives.length === 0 ? (
            <p className="text-[13px] text-[#666]">Chưa có category.</p>
          ) : (
            archiveGroups.archives.map((archive) => {
              const subs = archiveGroups.byParent.get(archive.slug) ?? [];
              return (
                <div
                  key={archive.slug}
                  className="rounded-lg border border-border-light p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Folder className="size-5 text-brand" />
                        <p className="truncate text-[14px] font-bold">
                          {archive.title}
                        </p>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#666]">
                        slug: <code>{archive.slug}</code>
                      </p>
                      <p className="mt-1 text-[12px] text-[#666]">
                        Bài:{" "}
                        <strong className="text-brand">
                          {archive.article_count}
                        </strong>{" "}
                        · Sub:{" "}
                        <strong className="text-brand">
                          {archive.subcategory_count}
                        </strong>
                      </p>
                    </div>
                    {renderCategoryActions(archive)}
                  </div>

                  {subs.length > 0 ? (
                    <div className="mt-3 space-y-2 pl-3">
                      {subs.map((sc) => (
                        <div
                          key={sc.slug}
                          className="flex items-center justify-between gap-3 rounded-md border border-border-light bg-[#faf5ff]"
                        >
                          <div className="min-w-0 px-3 py-2">
                            <p className="truncate text-[13px] font-semibold">
                              {sc.title}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[#666]">
                              <code>{sc.slug}</code>
                            </p>
                            <p className="mt-0.5 text-[11px] text-[#666]">
                              Bài:{" "}
                              <strong className="text-brand">
                                {sc.article_count}
                              </strong>
                            </p>
                          </div>
                          {renderCategoryActions(sc, true)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 pl-1 text-[12px] text-[#666]">
                      Chưa có subcategory.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border-light bg-white p-4">
        <h3 className="mb-3 text-[15px] font-bold">Tạo category mới</h3>
        <form onSubmit={onCreateCategory} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Loại category
              </span>
              <select
                value={createKind}
                onChange={(e) =>
                  setCreateKind(e.target.value as "archive" | "subcategory")
                }
                className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
              >
                <option value="subcategory">Subcategory</option>
                <option value="archive">Archive</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Total pages
              </span>
              <input
                type="number"
                min={1}
                value={createTotalPages}
                onChange={(e) => setCreateTotalPages(Number(e.target.value))}
                className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>

          {createKind === "subcategory" ? (
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#666]">
                Parent
              </span>
              <select
                value={createParentSlug}
                onChange={(e) => setCreateParentSlug(e.target.value)}
                className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
              >
                {createParents.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#666]">
              Tên category
            </span>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="vd: Cơ xương khớp"
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

          <div className="space-y-2 rounded border border-border-light bg-[#faf5ff] p-3">
            <label className="flex items-start gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={addToMenu}
                onChange={(e) => setAddToMenu(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Thêm vào menu navigation
                <span className="mt-0.5 block text-[12px] text-[#666]">
                  Archive → mục top-level · Subcategory → dropdown của parent
                </span>
              </span>
            </label>
            {createKind === "archive" ? (
              <label className="flex items-start gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={addHomepageSection}
                  onChange={(e) => setAddHomepageSection(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Tạo section trống trên homepage
                  <span className="mt-0.5 block text-[12px] text-[#666]">
                    Section mới với “Xem thêm” trỏ tới archive; bài sẽ gắn sau ở
                    Homepage.
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              <FolderPlus className="size-4" />
              {creating
                ? "Đang tạo..."
                : createKind === "archive"
                  ? "Tạo archive"
                  : "Tạo subcategory"}
            </button>
          </div>
        </form>
      </div>

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

      {editing ? (
        <div className="rounded-lg border border-border-light bg-white p-4">
          <h3 className="mb-3 text-[15px] font-bold">Sửa category</h3>
          <form onSubmit={onSaveEdit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="rounded border border-border-light bg-[#faf5ff] p-3">
                <p className="text-[12px] text-[#666]">
                  slug: <code>{editing.slug}</code>
                </p>
                <p className="mt-1 text-[12px] text-[#666]">
                  kind: <strong>{editing.kind}</strong>
                </p>
                {editing.parent_slug ? (
                  <p className="mt-1 text-[12px] text-[#666]">
                    parent: <code>{editing.parent_slug}</code>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#666]">
                  Total pages
                </span>
                <input
                  type="number"
                  min={1}
                  value={editTotalPages}
                  onChange={(e) => setEditTotalPages(Number(e.target.value))}
                  className="w-full rounded border border-border-light px-3 py-2 text-[13px] outline-none focus:border-brand"
                />
              </label>

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
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex items-center gap-2 rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => setEditing(null)}
                className="rounded border border-border-light px-4 py-2 text-[13px] font-medium hover:bg-brand-light"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
