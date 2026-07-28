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
  AdminNavDropdownItem,
  AdminNavItem,
} from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function MenuItemDetail({
  item: initial,
  dropdowns: initialDropdowns,
}: {
  item: AdminNavItem;
  dropdowns: AdminNavDropdownItem[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [item, setItem] = useState(initial);
  const [dropdowns, setDropdowns] = useState(initialDropdowns);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);

  const sorted = useMemo(
    () => [...dropdowns].sort((a, b) => a.sort_order - b.sort_order),
    [dropdowns],
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
        .from("nav_items")
        .update({
          label: item.label,
          href: item.href,
          has_dropdown: item.has_dropdown,
          sort_order: item.sort_order,
        })
        .eq("id", item.id);
      if (updateError) throw new Error(updateError.message);

      for (const [index, drop] of sorted.entries()) {
        const { error: dropError } = await supabase
          .from("nav_dropdown_items")
          .update({
            text: drop.text,
            href: drop.href,
            sort_order: index,
          })
          .eq("id", drop.id);
        if (dropError) throw new Error(dropError.message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function addDropdown() {
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("nav_dropdown_items")
      .insert({
        nav_item_id: item.id,
        text: "Item mới",
        href: "/",
        sort_order: dropdowns.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDropdowns((prev) => [...prev, data as AdminNavDropdownItem]);
    setItem((prev) => ({ ...prev, has_dropdown: true }));
    router.refresh();
  }

  async function removeDropdown(id: string) {
    const ok = await confirm({
      title: "Xóa dropdown item?",
      description: "Không thể hoàn tác.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("nav_dropdown_items")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setDropdowns((prev) => prev.filter((d) => d.id !== id));
    router.refresh();
  }

  const columns: AdminTableColumn<AdminNavDropdownItem>[] = [
    {
      key: "text",
      header: "Text",
      cell: (drop) => (
        <input
          value={drop.text}
          onChange={(e) =>
            setDropdowns((prev) =>
              prev.map((d) =>
                d.id === drop.id ? { ...d, text: e.target.value } : d,
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
      cell: (drop) => (
        <input
          value={drop.href}
          onChange={(e) =>
            setDropdowns((prev) =>
              prev.map((d) =>
                d.id === drop.id ? { ...d, href: e.target.value } : d,
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
      cell: (drop) => (
        <button
          type="button"
          onClick={() => removeDropdown(drop.id)}
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
        <h2 className="text-[16px] font-bold">Sửa mục menu</h2>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Label</span>
          <input
            value={item.label}
            onChange={(e) => setItem({ ...item, label: e.target.value })}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Href</span>
          <input
            value={item.href}
            onChange={(e) => setItem({ ...item, href: e.target.value })}
            className="w-full rounded border border-border-light px-3 py-2 text-[13px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={item.has_dropdown}
            onChange={(e) =>
              setItem({ ...item, has_dropdown: e.target.checked })
            }
          />
          Có dropdown
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] text-[#666]">Sort order</span>
          <input
            type="number"
            value={item.sort_order}
            onChange={(e) =>
              setItem({ ...item, sort_order: Number(e.target.value) })
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
            href="/admin/menu"
            className="rounded border border-border-light px-4 py-2 text-[13px]"
          >
            Quay lại
          </Link>
        </div>
      </form>

      <div className="space-y-3 rounded-lg border border-border-light bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Dropdown items</h3>
          <button
            type="button"
            onClick={() => addDropdown()}
            className="rounded border border-border-light px-3 py-1.5 text-[13px]"
          >
            + Item
          </button>
        </div>
        <AdminDataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="Chưa có dropdown item"
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
