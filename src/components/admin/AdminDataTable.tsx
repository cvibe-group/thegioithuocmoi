"use client";

import type { ReactNode } from "react";
import type { AdminTableColumn } from "@/lib/admin/pagination";

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Không có dữ liệu",
  loading = false,
}: {
  columns: AdminTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-light bg-white">
      <table className="min-w-full text-left text-[13px]">
        <thead className="border-b border-border-light bg-brand-light text-[#444]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-semibold ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[#666]"
              >
                Đang tải…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-[#666]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border-light last:border-0"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-3 ${col.className ?? ""}`}
                  >
                    {col.cell(row) as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
