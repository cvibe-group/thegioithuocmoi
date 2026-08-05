"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Editor } from "ckeditor5";
import type { ArticleBlock } from "@/types/content";
import {
  type AdminArticle,
  type CategoryOption,
  DEFAULT_AUTHOR,
  DEFAULT_AUTHOR_BIO,
  buildArticlePath,
  formatAdminDateTime,
  toPublishedOn,
  categoryHrefFromSlug,
  groupCategoryOptions,
  slugify,
  toDateLabel,
  toDatetimeLabel,
  todayParts,
} from "@/lib/admin/articles";
import type { AuthorOption } from "@/lib/admin/author-queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { createAuthBrowserClient } from "@/lib/supabase/browser";
import { blocksToHtml } from "@/lib/content/blocks-to-html";
import { htmlToBlocks } from "@/lib/content/html-to-blocks";
import { sanitizeArticleHtml } from "@/lib/content/html-sanitize";
import {
  optimizeImageForUpload,
  storageExtForFile,
} from "@/lib/admin/optimize-image";
import { ChevronDown, ChevronUp } from "lucide-react";

const ArticleCkEditor = dynamic(
  () =>
    import("@/components/admin/ArticleCkEditor").then((m) => m.ArticleCkEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded border border-[#d9d9d9] bg-[#fafafa] px-3 py-8 text-center text-[13px] text-[#666]">
        Đang tải trình soạn thảo…
      </div>
    ),
  },
);

type FormState = {
  title: string;
  slug: string;
  year: string;
  month: string;
  day: string;
  categorySlug: string;
  read_time: string;
  excerpt: string;
  authorIds: string[];
  layout: "" | "card" | "wide";
  image: string;
  is_published: boolean;
  tags: string;
  contentHtml: string;
};

function defaultAuthorIds(authors: AuthorOption[]) {
  const preferred =
    authors.find((item) => item.name === DEFAULT_AUTHOR) ??
    authors.find((item) => item.slug === "nguyen-tien-su") ??
    authors[0];
  return preferred ? [preferred.id] : [];
}

function emptyForm(
  categories: CategoryOption[],
  authors: AuthorOption[],
): FormState {
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
    authorIds: defaultAuthorIds(authors),
    layout: "card",
    image: "",
    is_published: true,
    tags: "",
    contentHtml: "",
  };
}

function fromArticle(
  article: AdminArticle,
  categories: CategoryOption[],
  authors: AuthorOption[],
): FormState {
  const matched =
    categories.find((item) => categoryHrefFromSlug(item.slug) === article.category_href) ??
    categories.find((item) => item.title === article.category_label);

  const contentHtml =
    article.content_html?.trim() ||
    blocksToHtml(article.blocks?.length ? article.blocks : []);

  const authorIds =
    article.author_ids?.length
      ? article.author_ids
      : (() => {
          const byName = authors.find(
            (item) => item.name === (article.author ?? DEFAULT_AUTHOR),
          );
          return byName ? [byName.id] : defaultAuthorIds(authors);
        })();

  return {
    title: article.title,
    slug: article.slug,
    year: article.year,
    month: article.month,
    day: article.day,
    categorySlug: matched?.slug ?? "thuoc",
    read_time: article.read_time,
    excerpt: article.excerpt ?? "",
    authorIds,
    layout: article.layout === "wide" || article.layout === "card" ? article.layout : "card",
    image: article.image ?? "",
    is_published: article.is_published,
    tags: (article.tags ?? []).join(", "),
    contentHtml,
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

async function syncArticleAuthors(
  articleId: string,
  authorIds: string[],
) {
  const supabase = createAuthBrowserClient();
  const { error: deleteError } = await supabase
    .from("article_authors")
    .delete()
    .eq("article_id", articleId);
  if (deleteError) throw new Error(deleteError.message);

  if (authorIds.length === 0) return;

  const { error: insertError } = await supabase.from("article_authors").insert(
    authorIds.map((authorId, index) => ({
      article_id: articleId,
      author_id: authorId,
      sort_order: index,
    })),
  );
  if (insertError) throw new Error(insertError.message);
}

export function ArticleForm({
  mode,
  categories,
  authors,
  initial,
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  authors: AuthorOption[];
  initial?: AdminArticle;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? fromArticle(initial, categories, authors)
      : emptyForm(categories, authors),
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mediaPickerFor, setMediaPickerFor] = useState<null | "hero" | "body">(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const ckEditorRef = useRef<Editor | null>(null);

  const previewPath = useMemo(
    () => buildArticlePath(form.year, form.month, form.day, form.slug || "slug"),
    [form.year, form.month, form.day, form.slug],
  );

  const selectedCategory = categories.find((item) => item.slug === form.categorySlug);
  const authorById = useMemo(
    () => new Map(authors.map((item) => [item.id, item])),
    [authors],
  );
  const selectedAuthors = form.authorIds
    .map((id) => authorById.get(id))
    .filter((item): item is AuthorOption => Boolean(item));

  function toggleAuthor(authorId: string) {
    setForm((prev) => {
      if (prev.authorIds.includes(authorId)) {
        return {
          ...prev,
          authorIds: prev.authorIds.filter((id) => id !== authorId),
        };
      }
      return { ...prev, authorIds: [...prev.authorIds, authorId] };
    });
  }

  function moveAuthor(authorId: string, direction: -1 | 1) {
    setForm((prev) => {
      const index = prev.authorIds.indexOf(authorId);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.authorIds.length) return prev;
      const next = [...prev.authorIds];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return { ...prev, authorIds: next };
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
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      const actorId = sessionUser?.id ?? null;
      const actorEmail = sessionUser?.email ?? null;
      let image = form.image;

      if (form.authorIds.length === 0) {
        throw new Error("Chọn ít nhất một tác giả");
      }

      if (imageFile) {
        const optimized = await optimizeImageForUpload(imageFile);
        const ext = storageExtForFile(optimized);
        const objectPath = `thegioithuocmoi/article-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(objectPath, optimized, {
            upsert: true,
            contentType: optimized.type,
            cacheControl: "31536000",
          });
        if (uploadError) throw new Error(uploadError.message);
        image = supabase.storage.from("images").getPublicUrl(objectPath).data.publicUrl;
      }

      const primaryAuthor =
        selectedAuthors[0] ??
        authorById.get(form.authorIds[0]) ??
        null;
      const legacyAuthor = primaryAuthor?.name ?? DEFAULT_AUTHOR;
      const legacyBio = primaryAuthor?.bio?.trim() || DEFAULT_AUTHOR_BIO;
      const legacyImage = primaryAuthor?.image?.trim() || null;

      const path = buildArticlePath(form.year, form.month, form.day, slug);
      const layout = form.layout || null;
      const sanitizedHtml = sanitizeArticleHtml(form.contentHtml);
      const blocks: ArticleBlock[] = htmlToBlocks(sanitizedHtml, {
        includeImages: true,
      });
      const payload: Record<string, unknown> = {
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
        author: legacyAuthor,
        author_bio: legacyBio,
        author_image: legacyImage,
        layout,
        content_html: sanitizedHtml || null,
        blocks,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
        updated_by_id: actorId,
        updated_by_email: actorEmail,
      };
      if (mode === "create") {
        payload.created_by_id = actorId;
        payload.created_by_email = actorEmail;
      }

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
          if (insertError?.message?.includes("tags")) {
            const { tags: _tags, ...withoutTags } = body;
            ({ data, error: insertError } = await supabase
              .from("articles")
              .insert(withoutTags)
              .select("id, path")
              .single());
          }
          if (insertError?.message?.includes("content_html")) {
            const { content_html: _html, ...withoutHtml } = body;
            ({ data, error: insertError } = await supabase
              .from("articles")
              .insert(withoutHtml)
              .select("id, path")
              .single());
          }
          if (
            insertError?.message?.includes("created_by_") ||
            insertError?.message?.includes("updated_by_")
          ) {
            const {
              created_by_id: _cId,
              created_by_email: _cEmail,
              updated_by_id: _uId,
              updated_by_email: _uEmail,
              ...withoutAudit
            } = body;
            ({ data, error: insertError } = await supabase
              .from("articles")
              .insert(withoutAudit)
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
        if (updateError?.message?.includes("tags")) {
          const { tags: _tags, ...withoutTags } = body;
          ({ error: updateError } = await supabase
            .from("articles")
            .update(withoutTags)
            .eq("id", initial.id));
        }
        if (updateError?.message?.includes("content_html")) {
          const { content_html: _html, ...withoutHtml } = body;
          ({ error: updateError } = await supabase
            .from("articles")
            .update(withoutHtml)
            .eq("id", initial.id));
        }
        if (
          updateError?.message?.includes("created_by_") ||
          updateError?.message?.includes("updated_by_")
        ) {
          const {
            created_by_id: _cId,
            created_by_email: _cEmail,
            updated_by_id: _uId,
            updated_by_email: _uEmail,
            ...withoutAudit
          } = body;
          ({ error: updateError } = await supabase
            .from("articles")
            .update(withoutAudit)
            .eq("id", initial.id));
        }
        if (updateError) throw new Error(updateError.message);
        return { id: initial.id, path: initial.path };
      }

      async function revalidatePublic(paths: string[]) {
        try {
          await fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paths }),
          });
        } catch {
          // non-blocking
        }
      }

      if (mode === "create") {
        const data = await persistArticle("create", payload);

        await syncArticleAuthors(data.id, form.authorIds);
        await syncCategoryLink({
          newPath: data.path,
          categorySlug: form.categorySlug,
          layout,
        });

        await revalidatePublic([data.path, "/"]);
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
      await syncArticleAuthors(initial.id, form.authorIds);

      await syncCategoryLink({
        oldPath: initial.path,
        newPath: initial.path,
        categorySlug: form.categorySlug,
        previousCategorySlug: fromArticle(initial, categories, authors)
          .categorySlug,
        layout,
      });

      await revalidatePublic([initial.path, "/"]);
      router.refresh();
      setImageFile(null);
      setForm((prev) => ({
        ...prev,
        image: image || "",
      }));
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
              href={
                form.is_published ? previewPath : `${previewPath}?preview=1`
              }
              target="_blank"
              rel="noreferrer"
              className="rounded border border-border-light px-3 py-2 text-[13px]"
            >
              {form.is_published ? "Xem trên site" : "Preview draft"}
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

          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Tags</span>
            <input
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
              placeholder="VD: huyết áp, tim mạch (cách nhau bởi dấu phẩy)"
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
          </label>

          <div className="space-y-3">
            <h2 className="text-[15px] font-bold">Nội dung</h2>
            <ArticleCkEditor
              value={form.contentHtml}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, contentHtml: html }))
              }
              editorRef={ckEditorRef}
              onRequestMedia={() => setMediaPickerFor("body")}
            />
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMediaPickerFor("hero")}
                className="rounded border border-brand bg-brand-light px-3 py-1.5 text-[12px] font-medium text-brand"
              >
                Chọn từ Media
              </button>
            </div>
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold">Tác giả</p>
              <Link
                href="/admin/authors"
                className="text-[12px] text-brand hover:underline"
              >
                Quản lý tác giả
              </Link>
            </div>
            {authors.length === 0 ? (
              <p className="text-[13px] text-[#666]">
                Chưa có tác giả.{" "}
                <Link href="/admin/authors/new" className="text-brand hover:underline">
                  Tạo mới
                </Link>
              </p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {authors.map((author) => {
                  const selected = form.authorIds.includes(author.id);
                  const order = form.authorIds.indexOf(author.id);
                  return (
                    <li
                      key={author.id}
                      className="flex items-start gap-2 rounded border border-border-light px-2 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAuthor(author.id)}
                        className="mt-1"
                        id={`author-${author.id}`}
                      />
                      <label
                        htmlFor={`author-${author.id}`}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="block text-[13px] font-medium leading-snug">
                          {author.name}
                        </span>
                        {selected ? (
                          <span className="mt-0.5 block text-[11px] text-[#888]">
                            Thứ tự #{order + 1}
                          </span>
                        ) : null}
                      </label>
                      {selected ? (
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <button
                            type="button"
                            title="Lên"
                            onClick={() => moveAuthor(author.id, -1)}
                            disabled={order <= 0}
                            className="rounded border border-border-light p-0.5 text-[#666] disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Xuống"
                            onClick={() => moveAuthor(author.id, 1)}
                            disabled={order >= form.authorIds.length - 1}
                            className="rounded border border-border-light p-0.5 text-[#666] disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedAuthors.length > 0 ? (
              <p className="text-[11px] leading-relaxed text-[#888]">
                Hiển thị: {selectedAuthors.map((a) => a.name).join(", ")}
              </p>
            ) : (
              <p className="text-[11px] text-red-600">Chọn ít nhất một tác giả.</p>
            )}
          </div>

          {mode === "edit" && initial ? (
            <div className="space-y-2 rounded-lg border border-border-light bg-white p-4">
              <h2 className="text-[13px] font-bold text-[#0a0a0a]">Lịch sử CMS</h2>
              <dl className="space-y-2 text-[12px] text-[#555]">
                <div>
                  <dt className="font-medium text-[#888]">Người tạo</dt>
                  <dd>
                    {initial.created_by_email || "—"}
                    <span className="mt-0.5 block text-[11px] text-[#999]">
                      {formatAdminDateTime(initial.created_at)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[#888]">Cập nhật gần nhất</dt>
                  <dd>
                    {initial.updated_by_email || "—"}
                    <span className="mt-0.5 block text-[11px] text-[#999]">
                      {formatAdminDateTime(initial.updated_at)}
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="text-[11px] leading-relaxed text-[#999]">
                Tự ghi khi lưu bài (tài khoản đang đăng nhập). Không phải trường
                “Tác giả” hiển thị trên site.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      <MediaPickerDialog
        open={mediaPickerFor !== null}
        onClose={() => setMediaPickerFor(null)}
        onSelect={(url) => {
          if (mediaPickerFor === "hero") {
            setImageFile(null);
            setForm((prev) => ({ ...prev, image: url }));
            setMediaPickerFor(null);
            return;
          }
          if (mediaPickerFor === "body") {
            const editor = ckEditorRef.current;
            if (editor) {
              editor.model.change((writer) => {
                const imageElement = writer.createElement("imageBlock", {
                  src: url,
                  alt: "",
                });
                editor.model.insertContent(
                  imageElement,
                  editor.model.document.selection,
                );
              });
              setForm((prev) => ({ ...prev, contentHtml: editor.getData() }));
            } else {
              setForm((prev) => ({
                ...prev,
                contentHtml:
                  prev.contentHtml +
                  `<figure class="image"><img src="${url}" alt="" /></figure>`,
              }));
            }
            setMediaPickerFor(null);
          }
        }}
      />
    </form>
  );
}
