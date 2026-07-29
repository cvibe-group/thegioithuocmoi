"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminHomepageCategoryOption,
  AdminSidebarPanel,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function SidebarPanelDetail({
  panel: initial,
  categories,
}: {
  panel: AdminSidebarPanel;
  categories: AdminHomepageCategoryOption[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCategoryChange(slug: string) {
    const category = categories.find((c) => c.slug === slug);
    setPanel((prev) => ({
      ...prev,
      category_slug: slug || null,
      title: category?.title ?? prev.title,
      see_all_href: slug ? `/${slug}` : prev.see_all_href,
    }));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const base = {
        title: panel.title,
        see_all_href: panel.see_all_href,
        sort_order: panel.sort_order,
      };
      let { error: updateError } = await supabase
        .from("sidebar_panels")
        .update({ ...base, category_slug: panel.category_slug })
        .eq("id", panel.id);
      if (updateError?.message?.includes("category_slug")) {
        ({ error: updateError } = await supabase
          .from("sidebar_panels")
          .update(base)
          .eq("id", panel.id));
      }
      if (updateError) throw new Error(updateError.message);
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
        <h2 className="text-[16px] font-bold">Sửa panel</h2>
        <p className="text-[13px] text-[#666]">
          Mỗi lần load trang, sidebar lấy 15 bài ngẫu nhiên từ category đã chọn.
        </p>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Category</span>
          <select
            value={panel.category_slug ?? ""}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          >
            <option value="">— Chọn category —</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Title</span>
          <input
            value={panel.title}
            onChange={(e) => setPanel({ ...panel, title: e.target.value })}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">See all href</span>
          <input
            value={panel.see_all_href}
            onChange={(e) =>
              setPanel({ ...panel, see_all_href: e.target.value })
            }
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Sort order</span>
          <input
            type="number"
            value={panel.sort_order}
            onChange={(e) =>
              setPanel({ ...panel, sort_order: Number(e.target.value) })
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
            href="/admin/sidebar"
            className="rounded border border-border-light px-4 py-2 text-[13px]"
          >
            Quay lại
          </Link>
        </div>
      </form>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
