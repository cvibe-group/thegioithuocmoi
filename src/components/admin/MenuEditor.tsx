"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminNavDropdownItem, AdminNavItem } from "@/lib/admin/structure-queries";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function MenuEditor({
  initialItems,
  initialDropdowns,
}: {
  initialItems: AdminNavItem[];
  initialDropdowns: AdminNavDropdownItem[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [items, setItems] = useState(initialItems);
  const [dropdowns, setDropdowns] = useState(initialDropdowns);
  const [activeId, setActiveId] = useState(initialItems[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeDropdowns = dropdowns
    .filter((item) => item.nav_item_id === activeId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function saveAll() {
    setSaving(true);
    setError(null);
    const supabase = createAuthBrowserClient();

    for (const [index, item] of items.entries()) {
      const { error: itemError } = await supabase
        .from("nav_items")
        .update({
          label: item.label,
          href: item.href,
          has_dropdown: item.has_dropdown,
          sort_order: index,
        })
        .eq("id", item.id);
      if (itemError) {
        setSaving(false);
        setError(itemError.message);
        return;
      }
    }

    for (const item of dropdowns) {
      const siblings = dropdowns
        .filter((d) => d.nav_item_id === item.nav_item_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const sort_order = siblings.findIndex((d) => d.id === item.id);
      const { error: dropError } = await supabase
        .from("nav_dropdown_items")
        .update({
          text: item.text,
          href: item.href,
          sort_order,
        })
        .eq("id", item.id);
      if (dropError) {
        setSaving(false);
        setError(dropError.message);
        return;
      }
    }

    setSaving(false);
    router.refresh();
  }

  async function addNavItem() {
    setError(null);
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
    setItems((prev) => [...prev, data as AdminNavItem]);
    setActiveId(data.id);
    router.refresh();
  }

  async function removeNavItem(id: string) {
    const ok = await confirm({
      title: "Xóa mục menu?",
      description: "Mục menu này và các dropdown liên quan sẽ bị xóa.",
      confirmLabel: "Xóa menu",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase.from("nav_items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setDropdowns((prev) => prev.filter((item) => item.nav_item_id !== id));
    if (activeId === id) setActiveId("");
    router.refresh();
  }

  async function addDropdown() {
    if (!activeId) return;
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("nav_dropdown_items")
      .insert({
        nav_item_id: activeId,
        text: "Dropdown mới",
        href: "/",
        sort_order: activeDropdowns.length,
      })
      .select("*")
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDropdowns((prev) => [...prev, data as AdminNavDropdownItem]);
    setItems((prev) =>
      prev.map((item) =>
        item.id === activeId ? { ...item, has_dropdown: true } : item,
      ),
    );
    router.refresh();
  }

  async function removeDropdown(id: string) {
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("nav_dropdown_items")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setDropdowns((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  function moveItem(index: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addNavItem}
          className="rounded border border-border-light px-3 py-2 text-[13px]"
        >
          + Mục menu
        </button>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu menu"}
        </button>
      </div>
      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-lg border border-border-light bg-white p-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`rounded border p-2 ${
                activeId === item.id ? "border-brand bg-brand-light" : "border-border-light"
              }`}
            >
              <button
                type="button"
                className="mb-2 w-full text-left text-[13px] font-semibold"
                onClick={() => setActiveId(item.id)}
              >
                {item.label}
              </button>
              <div className="flex gap-2">
                <button type="button" className="text-[12px]" onClick={() => moveItem(index, -1)}>
                  ↑
                </button>
                <button type="button" className="text-[12px]" onClick={() => moveItem(index, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  className="text-[12px] text-red-600"
                  onClick={() => removeNavItem(item.id)}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>

        {activeId ? (
          <div className="space-y-4 rounded-lg border border-border-light bg-white p-4">
            {items
              .filter((item) => item.id === activeId)
              .map((item) => (
                <div key={item.id} className="space-y-3">
                  <label className="block text-[13px]">
                    Label
                    <input
                      value={item.label}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, label: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                  <label className="block text-[13px]">
                    Href
                    <input
                      value={item.href}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, href: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={item.has_dropdown}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, has_dropdown: event.target.checked }
                              : row,
                          ),
                        )
                      }
                    />
                    Có dropdown
                  </label>
                </div>
              ))}

            <div className="border-t border-border-light pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-bold">Dropdown items</h3>
                <button
                  type="button"
                  onClick={addDropdown}
                  className="rounded border border-border-light px-2 py-1 text-[12px]"
                >
                  + Item
                </button>
              </div>
              <div className="space-y-3">
                {activeDropdowns.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded border border-border-light p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={item.text}
                      onChange={(event) =>
                        setDropdowns((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, text: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[13px]"
                      placeholder="Text"
                    />
                    <input
                      value={item.href}
                      onChange={(event) =>
                        setDropdowns((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, href: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[13px]"
                      placeholder="Href"
                    />
                    <button
                      type="button"
                      onClick={() => removeDropdown(item.id)}
                      className="text-[12px] text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
