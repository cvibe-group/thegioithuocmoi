"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
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
  AdminSidebarItem,
  AdminSidebarPanel,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function SidebarPanelDetail({
  panel: initial,
  items: initialItems,
}: {
  panel: AdminSidebarPanel;
  items: AdminSidebarItem[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [panel, setPanel] = useState(initial);
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );
  const { startIndex, endIndex, page: safePage } = paginationRange(
    page,
    pageSize,
    sorted.length,
  );
  const rows = sorted.slice(startIndex, endIndex);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const supabase = createAuthBrowserClient();
      const { error: updateError } = await supabase
        .from("sidebar_panels")
        .update({
          title: panel.title,
          see_all_href: panel.see_all_href,
          sort_order: panel.sort_order,
        })
        .eq("id", panel.id);
      if (updateError) throw new Error(updateError.message);

      for (const [index, item] of sorted.entries()) {
        const { error: itemError } = await supabase
          .from("sidebar_panel_items")
          .update({
            text: item.text,
            href: item.href,
            sort_order: index,
          })
          .eq("id", item.id);
        if (itemError) throw new Error(itemError.message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function addItem() {
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("sidebar_panel_items")
      .insert({
        panel_id: panel.id,
        text: "Link mới",
        href: "/",
        sort_order: items.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setItems((prev) => [...prev, data as AdminSidebarItem]);
    router.refresh();
  }

  async function removeItem(id: string) {
    const ok = await confirm({
      title: "Xóa link?",
      description: "Không thể hoàn tác.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("sidebar_panel_items")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    router.refresh();
  }

  const columns: AdminTableColumn<AdminSidebarItem>[] = [
    {
      key: "text",
      header: "Text",
      cell: (item) => (
        <input
          value={item.text}
          onChange={(e) =>
            setItems((prev) =>
              prev.map((row) =>
                row.id === item.id ? { ...row, text: e.target.value } : row,
              ),
            )
          }
          className="w-full rounded border border-border-light px-2 py-1 text-[13px]"
        />
      ),
    },
    {
      key: "href",
      header: "Href",
      cell: (item) => (
        <input
          value={item.href}
          onChange={(e) =>
            setItems((prev) =>
              prev.map((row) =>
                row.id === item.id ? { ...row, href: e.target.value } : row,
              ),
            )
          }
          className="w-full rounded border border-border-light px-2 py-1 text-[13px]"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (item) => (
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="text-red-600 hover:underline"
        >
          Xóa
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {dialog}
      <form
        onSubmit={onSave}
        className="space-y-4 rounded-lg border border-border-light bg-white p-4"
      >
        <h2 className="text-[16px] font-bold">Sửa panel</h2>
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

      <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Panel items</h3>
          <button
            type="button"
            onClick={() => addItem()}
            className="rounded border border-border-light px-3 py-1.5 text-[13px]"
          >
            + Link
          </button>
        </div>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="Chưa có link"
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
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
    </div>
  );
}
