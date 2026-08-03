"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

type MediaItem = { name: string; url: string };

export function MediaPickerDialog({
  open,
  onClose,
  onSelect,
  folder = "thegioithuocmoi",
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  folder?: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createAuthBrowserClient();
        const { data, error: listError } = await supabase.storage
          .from("images")
          .list(folder, {
            limit: 80,
            sortBy: { column: "created_at", order: "desc" },
          });
        if (listError) throw new Error(listError.message);
        if (cancelled) return;
        const files = (data ?? [])
          .filter((item) => typeof item.metadata?.size === "number")
          .map((item) => {
            const path = `${folder}/${item.name}`;
            const { data: pub } = supabase.storage.from("images").getPublicUrl(path);
            return { name: item.name, url: pub.publicUrl };
          });
        setItems(files);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được media");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, folder]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border-light bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
          <div>
            <p className="text-[15px] font-bold">Chọn ảnh từ Media</p>
            <p className="text-[12px] text-[#888]">
              Folder <code>{folder}</code>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[#666] hover:bg-brand-light hover:text-brand"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#666]">
              <Loader2 className="size-4 animate-spin" /> Đang tải…
            </div>
          ) : error ? (
            <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#666]">
              Chưa có ảnh trong folder này. Upload tại /admin/media.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-border-light text-left transition-colors hover:border-brand"
                >
                  <div className="relative aspect-square bg-brand-light">
                    <Image
                      src={item.url}
                      alt={item.name}
                      fill
                      className="object-contain p-1"
                      sizes="160px"
                      unoptimized
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] text-[#666] group-hover:text-brand">
                    {item.name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
