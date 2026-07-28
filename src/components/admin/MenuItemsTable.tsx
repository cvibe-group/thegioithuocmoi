"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import type { AdminNavItem } from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function MenuItemsTable({
  items: initialItems,
}: {
  items: AdminNavItem[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

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

  async function addItem() {
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("nav_items")
      .insert({
        label: "Mục mới",
        href: "/",
        has_dropdown: false,
        sort_order: items.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/admin/menu/${data.id}`);
    router.refresh();
  }

  async function removeItem(item: AdminNavItem) {
    const ok = await confirm({
      title: "Xóa mục menu?",
      description: "Dropdown liên quan cũng sẽ bị xóa.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("nav_items")
      .delete()
      .eq("id", item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    router.refresh();
  }

  const columns: AdminTableColumn<AdminNavItem>[] = [
    {
      key: "label",
      header: "Label",
      cell: (item) => (
        <Link
          href={`/admin/menu/${item.id}`}
          className="font-semibold text-brand hover:underline"
        >
          {item.label}
        </Link>
      ),
    },
    { key: "href", header: "Href", cell: (item) => item.href },
    {
      key: "dropdown",
      header: "Dropdown",
      cell: (item) => (item.has_dropdown ? "Có" : "Không"),
    },
    { key: "sort", header: "Sort", cell: (item) => item.sort_order },
    {
      key: "actions",
      header: "Thao tác",
      cell: (item) => (
        <div className="flex gap-2">
          <Link
            href={`/admin/menu/${item.id}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <button
            type="button"
            onClick={() => removeItem(item)}
            className="text-red-600 hover:underline"
          >
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => addItem()}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white"
        >
          + Mục menu
        </button>
      </div>
      {error ? (
        <p className="text-[13px] text-red-600">{error}</p>
      ) : null}
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Chưa có mục menu"
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
  );
}
