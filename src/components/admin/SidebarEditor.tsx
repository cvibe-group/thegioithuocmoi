"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminSidebarItem, AdminSidebarPanel } from "@/lib/admin/structure-queries";
import { useConfirmDialog } from "@/components/admin/ConfirmDialog";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

export function SidebarEditor({
  initialPanels,
  initialItems,
}: {
  initialPanels: AdminSidebarPanel[];
  initialItems: AdminSidebarItem[];
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [panels, setPanels] = useState(initialPanels);
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState(initialPanels[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeItems = items
    .filter((item) => item.panel_id === activeId)
    .sort((a, b) => a.sort_order - b.sort_order);

  async function saveAll() {
    setSaving(true);
    setError(null);
    const supabase = createAuthBrowserClient();

    for (const [index, panel] of panels.entries()) {
      const { error: panelError } = await supabase
        .from("sidebar_panels")
        .update({
          title: panel.title,
          see_all_href: panel.see_all_href,
          sort_order: index,
        })
        .eq("id", panel.id);
      if (panelError) {
        setSaving(false);
        setError(panelError.message);
        return;
      }
    }

    for (const item of items) {
      const siblings = items
        .filter((row) => row.panel_id === item.panel_id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const sort_order = siblings.findIndex((row) => row.id === item.id);
      const { error: itemError } = await supabase
        .from("sidebar_panel_items")
        .update({
          text: item.text,
          href: item.href,
          sort_order,
        })
        .eq("id", item.id);
      if (itemError) {
        setSaving(false);
        setError(itemError.message);
        return;
      }
    }

    setSaving(false);
    router.refresh();
  }

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
    setPanels((prev) => [...prev, data as AdminSidebarPanel]);
    setActiveId(data.id);
    router.refresh();
  }

  async function removePanel(id: string) {
    const ok = await confirm({
      title: "Xóa panel sidebar?",
      description: "Panel này và các mục bên trong sẽ bị xóa vĩnh viễn.",
      confirmLabel: "Xóa panel",
      tone: "danger",
    });
    if (!ok) return;
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("sidebar_panels")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPanels((prev) => prev.filter((panel) => panel.id !== id));
    setItems((prev) => prev.filter((item) => item.panel_id !== id));
    if (activeId === id) setActiveId("");
    router.refresh();
  }

  async function addItem() {
    if (!activeId) return;
    const supabase = createAuthBrowserClient();
    const { data, error: insertError } = await supabase
      .from("sidebar_panel_items")
      .insert({
        panel_id: activeId,
        text: "Link mới",
        href: "/",
        sort_order: activeItems.length,
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
    const supabase = createAuthBrowserClient();
    const { error: deleteError } = await supabase
      .from("sidebar_panel_items")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addPanel}
          className="rounded border border-border-light px-3 py-2 text-[13px]"
        >
          + Panel
        </button>
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu sidebar"}
        </button>
      </div>
      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-2 rounded-lg border border-border-light bg-white p-3">
          {panels.map((panel) => (
            <div
              key={panel.id}
              className={`rounded border p-2 ${
                activeId === panel.id ? "border-brand bg-brand-light" : "border-border-light"
              }`}
            >
              <button
                type="button"
                className="mb-2 w-full text-left text-[13px] font-semibold"
                onClick={() => setActiveId(panel.id)}
              >
                {panel.title}
              </button>
              <button
                type="button"
                className="text-[12px] text-red-600"
                onClick={() => removePanel(panel.id)}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>

        {activeId ? (
          <div className="space-y-4 rounded-lg border border-border-light bg-white p-4">
            {panels
              .filter((panel) => panel.id === activeId)
              .map((panel) => (
                <div key={panel.id} className="space-y-3">
                  <label className="block text-[13px]">
                    Title
                    <input
                      value={panel.title}
                      onChange={(event) =>
                        setPanels((prev) =>
                          prev.map((row) =>
                            row.id === panel.id
                              ? { ...row, title: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                  <label className="block text-[13px]">
                    See all href
                    <input
                      value={panel.see_all_href}
                      onChange={(event) =>
                        setPanels((prev) =>
                          prev.map((row) =>
                            row.id === panel.id
                              ? { ...row, see_all_href: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
                    />
                  </label>
                </div>
              ))}

            <div className="border-t border-border-light pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-bold">Links</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded border border-border-light px-2 py-1 text-[12px]"
                >
                  + Link
                </button>
              </div>
              <div className="space-y-3">
                {activeItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-2 rounded border border-border-light p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={item.text}
                      onChange={(event) =>
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? { ...row, text: event.target.value }
                              : row,
                          ),
                        )
                      }
                      className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[13px]"
                    />
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
                      className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
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
