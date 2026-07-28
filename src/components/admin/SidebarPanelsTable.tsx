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
import type { AdminSidebarPanel } from "@/lib/admin/structure-queries";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function SidebarPanelsTable({
  panels: initialPanels,
}: {
  panels: AdminSidebarPanel[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [panels, setPanels] = useState(initialPanels);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(ADMIN_DEFAULT_PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...panels].sort((a, b) => a.sort_order - b.sort_order),
    [panels],
  );
  const { startIndex, endIndex, page: safePage } = paginationRange(
    page,
    pageSize,
    sorted.length,
  );
  const rows = sorted.slice(startIndex, endIndex);

  async function addPanel() {
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("sidebar_panels")
      .insert({
        title: "Panel mới",
        see_all_href: "/",
        sort_order: panels.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push(`/admin/sidebar/${data.id}`);
    router.refresh();
  }

  async function removePanel(panel: AdminSidebarPanel) {
    const ok = await confirm({
      title: "Xóa panel?",
      description: "Các link trong panel cũng sẽ bị xóa.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("sidebar_panels")
      .delete()
      .eq("id", panel.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPanels((prev) => prev.filter((p) => p.id !== panel.id));
    router.refresh();
  }

  const columns: AdminTableColumn<AdminSidebarPanel>[] = [
    {
      key: "title",
      header: "Title",
      cell: (panel) => (
        <Link
          href={`/admin/sidebar/${panel.id}`}
          className="font-semibold text-brand hover:underline"
        >
          {panel.title}
        </Link>
      ),
    },
    { key: "href", header: "See all", cell: (p) => p.see_all_href },
    { key: "sort", header: "Sort", cell: (p) => p.sort_order },
    {
      key: "actions",
      header: "Thao tác",
      cell: (panel) => (
        <div className="flex gap-2">
          <Link
            href={`/admin/sidebar/${panel.id}`}
            className="text-brand hover:underline"
          >
            Sửa
          </Link>
          <button
            type="button"
            onClick={() => removePanel(panel)}
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
          onClick={() => addPanel()}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white"
        >
          + Panel
        </button>
      </div>
      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Chưa có panel"
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
