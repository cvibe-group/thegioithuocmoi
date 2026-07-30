"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ArticleBlock } from "@/types/content";
import {
  type AdminArticle,
  type CategoryOption,
  DEFAULT_AUTHOR,
  DEFAULT_AUTHOR_BIO,
  buildArticlePath,
  toPublishedOn,
  categoryHrefFromSlug,
  groupCategoryOptions,
  slugify,
  toDateLabel,
  toDatetimeLabel,
  todayParts,
} from "@/lib/admin/articles";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

type FormState = {
  title: string;
  slug: string;
  year: string;
  month: string;
  day: string;
  categorySlug: string;
  read_time: string;
  excerpt: string;
  author: string;
  author_bio: string;
  layout: "" | "card" | "wide";
  image: string;
  is_published: boolean;
  blocks: ArticleBlock[];
};

function emptyForm(categories: CategoryOption[]): FormState {
  const today = todayParts();
  const first = categories[0];
  return {
    title: "",
    slug: "",
    year: today.year,
    month: today.month,
    day: today.day,
    categorySlug: first?.slug ?? "thuoc",
    read_time: "5 phút đọc",
    excerpt: "",
    author: DEFAULT_AUTHOR,
    author_bio: DEFAULT_AUTHOR_BIO,
    layout: "card",
    image: "",
    is_published: true,
    blocks: [{ type: "paragraph", text: "" }],
  };
}

function fromArticle(article: AdminArticle, categories: CategoryOption[]): FormState {
  const matched =
    categories.find((item) => categoryHrefFromSlug(item.slug) === article.category_href) ??
    categories.find((item) => item.title === article.category_label);

  return {
    title: article.title,
    slug: article.slug,
    year: article.year,
    month: article.month,
    day: article.day,
    categorySlug: matched?.slug ?? "thuoc",
    read_time: article.read_time,
    excerpt: article.excerpt ?? "",
    author: article.author ?? DEFAULT_AUTHOR,
    author_bio: article.author_bio ?? DEFAULT_AUTHOR_BIO,
    layout: article.layout === "wide" || article.layout === "card" ? article.layout : "card",
    image: article.image ?? "",
    is_published: article.is_published,
    blocks: article.blocks?.length ? article.blocks : [{ type: "paragraph", text: "" }],
  };
}

async function syncCategoryLink(opts: {
  oldPath?: string;
  newPath: string;
  categorySlug: string;
  previousCategorySlug?: string;
  layout: string | null;
}) {
  const supabase = createAuthBrowserClient();

  if (opts.oldPath && opts.oldPath !== opts.newPath) {
    // Đổi path: cập nhật mọi link cũ → path mới (giữ multi-category).
    await supabase
      .from("category_articles")
      .update({ article_path: opts.newPath })
      .eq("article_path", opts.oldPath);
    await supabase
      .from("homepage_section_articles")
      .update({ article_path: opts.newPath })
      .eq("article_path", opts.oldPath);

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["featured_article_path", "secondary_news_paths"]);

    for (const row of settings ?? []) {
      if (row.key === "featured_article_path" && row.value === opts.oldPath) {
        await supabase
          .from("site_settings")
          .update({ value: opts.newPath })
          .eq("key", "featured_article_path");
      }
      if (row.key === "secondary_news_paths" && Array.isArray(row.value)) {
        const next = row.value.map((item) =>
          item === opts.oldPath ? opts.newPath : item,
        );
        await supabase
          .from("site_settings")
          .update({ value: next })
          .eq("key", "secondary_news_paths");
      }
    }
  }

  // Chỉ thay primary category; giữ các archive phụ đã gắn từ CategoriesManager.
  if (
    opts.previousCategorySlug &&
    opts.previousCategorySlug !== opts.categorySlug
  ) {
    await supabase
      .from("category_articles")
      .delete()
      .eq("article_path", opts.newPath)
      .eq("category_slug", opts.previousCategorySlug);
  }

  await supabase.from("category_articles").upsert({
    category_slug: opts.categorySlug,
    article_path: opts.newPath,
    sort_order: 0,
    layout: opts.layout,
  });
}

export function ArticleForm({
  mode,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  initial?: AdminArticle;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    initial ? fromArticle(initial, categories) : emptyForm(categories),
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const previewPath = useMemo(
    () => buildArticlePath(form.year, form.month, form.day, form.slug || "slug"),
    [form.year, form.month, form.day, form.slug],
  );

  const selectedCategory = categories.find((item) => item.slug === form.categorySlug);

  function updateBlock(index: number, patch: Partial<ArticleBlock>) {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setForm((prev) => {
      const next = [...prev.blocks];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, blocks: next };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const slug = form.slug.trim() || slugify(form.title);
      if (!form.title.trim()) throw new Error("Nhập tiêu đề");
      if (!slug) throw new Error("Slug không hợp lệ");
      if (!/^\d{4}$/.test(form.year) || !/^\d{2}$/.test(form.month) || !/^\d{2}$/.test(form.day)) {
        throw new Error("Ngày không hợp lệ (YYYY / MM / DD)");
      }

      const supabase = createAuthBrowserClient();
      let image = form.image;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpeg";
        const objectPath = `thegioithuocmoi/article-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(objectPath, imageFile, {
            upsert: true,
            contentType: imageFile.type,
            cacheControl: "31536000",
          });
        if (uploadError) throw new Error(uploadError.message);
        image = supabase.storage.from("images").getPublicUrl(objectPath).data.publicUrl;
      }

      const path = buildArticlePath(form.year, form.month, form.day, slug);
      const layout = form.layout || null;
      const payload = {
        path,
        slug,
        year: form.year,
        month: form.month,
        day: form.day,
        title: form.title.trim(),
        category_label: selectedCategory?.title ?? form.categorySlug,
        category_href: categoryHrefFromSlug(form.categorySlug),
        date_label: toDateLabel(form.year, form.month, form.day),
        datetime_label: toDatetimeLabel(form.year, form.month, form.day),
        published_on: toPublishedOn(form.year, form.month, form.day),
        read_time: form.read_time.trim() || "5 phút đọc",
        image: image || null,
        excerpt: form.excerpt.trim() || null,
        author: form.author.trim() || DEFAULT_AUTHOR,
        author_bio: form.author_bio.trim() || DEFAULT_AUTHOR_BIO,
        layout,
        blocks: form.blocks,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      };

      async function persistArticle(
        mode: "create" | "edit",
        body: Record<string, unknown>,
      ): Promise<{ id: string; path: string }> {
        if (mode === "create") {
          let { data, error: insertError } = await supabase
            .from("articles")
            .insert(body)
            .select("id, path")
            .single();
          if (insertError?.message?.includes("published_on")) {
            const { published_on: _drop, ...without } = body;
            ({ data, error: insertError } = await supabase
              .from("articles")
              .insert(without)
              .select("id, path")
              .single());
          }
          if (insertError) throw new Error(insertError.message);
          if (!data) throw new Error("Không tạo được bài viết");
          return data;
        }
        if (!initial) throw new Error("Thiếu bài viết gốc");
        let { error: updateError } = await supabase
          .from("articles")
          .update(body)
          .eq("id", initial.id);
        if (updateError?.message?.includes("published_on")) {
          const { published_on: _drop, ...without } = body;
          ({ error: updateError } = await supabase
            .from("articles")
            .update(without)
            .eq("id", initial.id));
        }
        if (updateError) throw new Error(updateError.message);
        return { id: initial.id, path: initial.path };
      }

      if (mode === "create") {
        const data = await persistArticle("create", payload);

        await syncCategoryLink({
          newPath: data.path,
          categorySlug: form.categorySlug,
          layout,
        });

        router.replace(`/admin/articles/${data.id}`);
        router.refresh();
        return;
      }

      if (!initial) throw new Error("Thiếu bài viết gốc");

      // Keep path immutable on edit.
      const editPayload = {
        ...payload,
        path: initial.path,
        slug: initial.slug,
        year: initial.year,
        month: initial.month,
        day: initial.day,
        date_label: initial.date_label,
        datetime_label: initial.datetime_label,
        published_on: toPublishedOn(initial.year, initial.month, initial.day),
      };

      await persistArticle("edit", editPayload);

      await syncCategoryLink({
        oldPath: initial.path,
        newPath: initial.path,
        categorySlug: form.categorySlug,
        previousCategorySlug: fromArticle(initial, categories).categorySlug,
        layout,
      });

      router.refresh();
      setImageFile(null);
      setForm((prev) => ({ ...prev, image: image || "" }));
      setMessage("Đã lưu bài viết.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được bài viết");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold">
            {mode === "create" ? "Bài viết mới" : "Sửa bài viết"}
          </h1>
          <p className="mt-1 text-[13px] text-[#666]">Path: {previewPath}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/articles"
            className="rounded border border-border-light px-3 py-2 text-[13px]"
          >
            Quay lại
          </Link>
          {mode === "edit" ? (
            <a
              href={previewPath}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-border-light px-3 py-2 text-[13px]"
            >
              Xem trên site
            </a>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu bài viết"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-lg border border-border-light bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Tiêu đề</span>
            <input
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: slugTouched ? prev.slug : slugify(title),
                }));
              }}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Slug</span>
            <input
              value={form.slug}
              disabled={mode === "edit"}
              onChange={(event) => {
                setSlugTouched(true);
                setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
              }}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand disabled:bg-[#f5f5f5]"
              required
            />
            {mode === "edit" ? (
              <span className="mt-1 block text-[11px] text-[#888]">
                Path/slug không đổi sau khi tạo (tránh gãy liên kết chuyên mục).
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Tóm tắt / Excerpt</span>
            <textarea
              value={form.excerpt}
              onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
              rows={3}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold">Nội dung (blocks)</h2>
              <div className="flex gap-2">
                {(
                  [
                    ["heading", "Heading"],
                    ["paragraph", "Paragraph"],
                    ["list", "List"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        blocks: [
                          ...prev.blocks,
                          type === "list"
                            ? { type, items: [""] }
                            : { type, text: "" },
                        ],
                      }))
                    }
                    className="rounded border border-border-light px-2 py-1 text-[12px] hover:border-brand hover:text-brand"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>

            {form.blocks.map((block, index) => (
              <div
                key={`${block.type}-${index}`}
                className="rounded border border-border-light bg-[#fafafa] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold uppercase text-[#666]">
                    {block.type}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      className="text-[12px] text-[#666]"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      className="text-[12px] text-[#666]"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          blocks: prev.blocks.filter((_, i) => i !== index),
                        }))
                      }
                      className="text-[12px] text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                </div>

                {block.type === "list" ? (
                  <textarea
                    value={(block.items ?? []).join("\n")}
                    onChange={(event) =>
                      updateBlock(index, {
                        items: event.target.value.split("\n"),
                      })
                    }
                    rows={4}
                    placeholder="Mỗi dòng một mục"
                    className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
                  />
                ) : (
                  <textarea
                    value={block.text ?? ""}
                    onChange={(event) => updateBlock(index, { text: event.target.value })}
                    rows={block.type === "heading" ? 2 : 4}
                    className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_published: event.target.checked }))
                }
              />
              Published
            </label>

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Chuyên mục</span>
              <select
                value={form.categorySlug}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categorySlug: event.target.value }))
                }
                className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              >
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

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium">Năm</span>
                <input
                  value={form.year}
                  disabled={mode === "edit"}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, year: event.target.value }))
                  }
                  className="w-full rounded border border-[#d9d9d9] px-2 py-2 text-[13px] outline-none focus:border-brand disabled:bg-[#f5f5f5]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium">Tháng</span>
                <input
                  value={form.month}
                  disabled={mode === "edit"}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, month: event.target.value }))
                  }
                  className="w-full rounded border border-[#d9d9d9] px-2 py-2 text-[13px] outline-none focus:border-brand disabled:bg-[#f5f5f5]"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium">Ngày</span>
                <input
                  value={form.day}
                  disabled={mode === "edit"}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, day: event.target.value }))
                  }
                  className="w-full rounded border border-[#d9d9d9] px-2 py-2 text-[13px] outline-none focus:border-brand disabled:bg-[#f5f5f5]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Layout card</span>
              <select
                value={form.layout}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    layout: event.target.value as FormState["layout"],
                  }))
                }
                className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              >
                <option value="card">Card</option>
                <option value="wide">Wide</option>
                <option value="">Default</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Thời gian đọc</span>
              <input
                value={form.read_time}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, read_time: event.target.value }))
                }
                className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
            <p className="text-[13px] font-bold">Ảnh bài viết</p>
            <ImageUploadField
              selectedFile={imageFile}
              previewUrl={form.image || null}
              previewAlt={form.title || "Ảnh bài viết"}
              onFileChange={setImageFile}
              onClear={() => {
                setImageFile(null);
                setForm((prev) => ({ ...prev, image: "" }));
              }}
            />
            <input
              value={form.image}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, image: event.target.value }))
              }
              placeholder="Hoặc dán URL ảnh"
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[12px] outline-none focus:border-brand"
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Tác giả</span>
              <input
                value={form.author}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, author: event.target.value }))
                }
                className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium">Bio tác giả</span>
              <textarea
                value={form.author_bio}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, author_bio: event.target.value }))
                }
                rows={5}
                className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>
        </aside>
      </div>
    </form>
  );
}
