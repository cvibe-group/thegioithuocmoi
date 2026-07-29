"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminHomepageSection } from "@/lib/admin/structure-queries";
import type { Article } from "@/types/content";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function HomepageSectionDetail({
  section: initial,
  previewArticles,
}: {
  section: AdminHomepageSection;
  previewArticles: Article[];
}) {
  const router = useRouter();
  const [section, setSection] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSave}
        className="space-y-4 rounded-lg border border-border-light bg-white p-4"
      >
        <h2 className="text-[16px] font-bold">Sửa section</h2>
        <p className="text-[13px] text-[#666]">
          Category: <code className="text-[12px]">{section.id}</code> — trang
          chủ luôn lấy 6 bài mới nhất của category này.
        </p>
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
        <h3 className="text-[15px] font-bold">Preview — 6 bài mới nhất</h3>
        {previewArticles.length === 0 ? (
          <p className="text-[13px] text-[#666]">Chưa có bài trong category này.</p>
        ) : (
          <ul className="space-y-2">
            {previewArticles.map((article) => (
              <li key={article.href} className="text-[13px]">
                <Link href={article.href} className="text-brand hover:underline">
                  {article.title}
                </Link>
                <span className="ml-2 text-[#888]">{article.date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
