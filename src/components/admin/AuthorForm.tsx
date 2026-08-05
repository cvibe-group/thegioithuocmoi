"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { MediaPickerDialog } from "@/components/admin/MediaPickerDialog";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { slugify } from "@/lib/admin/articles";
import type { AdminAuthor } from "@/lib/admin/author-queries";
import {
  optimizeImageForUpload,
  storageExtForFile,
} from "@/lib/admin/optimize-image";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function AuthorForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: AdminAuthor | null;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedName = name.trim();
    const nextSlug = (slugTouched ? slug : slugify(trimmedName)).trim();
    if (!trimmedName) {
      setError("Vui lòng nhập tên tác giả.");
      return;
    }
    if (!nextSlug) {
      setError("Slug không hợp lệ.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createAuthBrowserClient();
      let imageUrl = image.trim() || null;

      if (imageFile) {
        const optimized = await optimizeImageForUpload(imageFile, {
          maxWidth: 512,
          quality: 0.85,
        });
        const ext = storageExtForFile(optimized);
        const objectPath = `thegioithuocmoi/author-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(objectPath, optimized, {
            upsert: true,
            contentType: optimized.type,
            cacheControl: "31536000",
          });
        if (uploadError) throw new Error(uploadError.message);
        imageUrl = supabase.storage.from("images").getPublicUrl(objectPath)
          .data.publicUrl;
      }

      const payload = {
        name: trimmedName,
        slug: nextSlug,
        bio: bio.trim(),
        image: imageUrl,
        sort_order: Math.floor(sortOrder),
        updated_at: new Date().toISOString(),
      };

      if (mode === "create") {
        const { data, error: insertError } = await supabase
          .from("authors")
          .insert(payload)
          .select("id")
          .single();
        if (insertError) throw new Error(insertError.message);
        router.replace(`/admin/authors/${data.id}`);
        router.refresh();
        return;
      }

      if (!initial) throw new Error("Thiếu tác giả gốc");
      const { error: updateError } = await supabase
        .from("authors")
        .update(payload)
        .eq("id", initial.id);
      if (updateError) throw new Error(updateError.message);

      setImageFile(null);
      setImage(imageUrl ?? "");
      setSlug(nextSlug);
      setMessage("Đã lưu tác giả.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tác giả");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    const ok = await confirm({
      title: `Xóa tác giả “${initial.name}”?`,
      description:
        initial.article_count > 0
          ? `Tác giả đang gắn với ${initial.article_count} bài — sẽ gỡ liên kết, không xóa bài viết.`
          : "Thao tác này không thể hoàn tác.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      await supabase.from("article_authors").delete().eq("author_id", initial.id);
      const { error: deleteError } = await supabase
        .from("authors")
        .delete()
        .eq("id", initial.id);
      if (deleteError) throw new Error(deleteError.message);
      router.replace("/admin/authors");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold">
            {mode === "create" ? "Tác giả mới" : "Sửa tác giả"}
          </h1>
          {mode === "edit" && initial ? (
            <p className="mt-1 text-[13px] text-[#666]">
              Đang gắn {initial.article_count} bài viết
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/authors"
            className="rounded border border-border-light bg-white px-4 py-2 text-[13px] font-medium"
          >
            Danh sách
          </Link>
          {mode === "edit" ? (
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className="rounded border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-medium text-red-700 disabled:opacity-50"
            >
              Xóa
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-lg border border-border-light bg-white p-4">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Tên</span>
            <input
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!slugTouched) setSlug(slugify(value));
              }}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Slug</span>
            <input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Bio</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={8}
              className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium">Sort order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value) || 0)}
              className="w-32 rounded border border-[#d9d9d9] px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
          <p className="text-[13px] font-bold">Avatar</p>
          <ImageUploadField
            previewAspectClassName="aspect-square max-w-[160px]"
            selectedFile={imageFile}
            previewUrl={image || null}
            previewAlt={name || "Avatar tác giả"}
            onFileChange={setImageFile}
            onClear={() => {
              setImageFile(null);
              setImage("");
            }}
          />
          <button
            type="button"
            onClick={() => setMediaOpen(true)}
            className="rounded border border-brand bg-brand-light px-3 py-1.5 text-[12px] font-medium text-brand"
          >
            Chọn từ Media
          </button>
          <input
            value={image}
            onChange={(event) => setImage(event.target.value)}
            placeholder="Hoặc dán URL avatar"
            className="w-full rounded border border-[#d9d9d9] px-3 py-2 text-[12px] outline-none focus:border-brand"
          />
        </div>
      </div>

      <MediaPickerDialog
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(url) => {
          setImageFile(null);
          setImage(url);
          setMediaOpen(false);
        }}
      />
    </form>
  );
}
