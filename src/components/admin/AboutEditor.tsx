"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

type AboutData = {
  title: string;
  paragraphs: string[];
  representative: string;
  members: string[];
  address: string;
};

export function AboutEditor({ initial }: { initial: AboutData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const supabase = createAuthBrowserClient();
    const payload = {
      ...form,
      paragraphs: form.paragraphs.map((item) => item.trim()).filter(Boolean),
      members: form.members.map((item) => item.trim()).filter(Boolean),
    };

    const { error: upsertError } = await supabase.from("site_settings").upsert({
      key: "about_us",
      value: payload,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setMessage("Đã lưu About us.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4 rounded-lg border border-border-light bg-white p-5">
      <label className="block text-[13px]">
        Title
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
        />
      </label>

      <label className="block text-[13px]">
        Paragraphs (mỗi đoạn một dòng trống để tách — hoặc mỗi dòng một đoạn)
        <textarea
          value={form.paragraphs.join("\n\n")}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              paragraphs: event.target.value
                .split(/\n\s*\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          rows={8}
          className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
        />
      </label>

      <label className="block text-[13px]">
        Đại diện
        <input
          value={form.representative}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, representative: event.target.value }))
          }
          className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
        />
      </label>

      <label className="block text-[13px]">
        Thành viên (mỗi dòng một người)
        <textarea
          value={form.members.join("\n")}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              members: event.target.value.split("\n"),
            }))
          }
          rows={6}
          className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
        />
      </label>

      <label className="block text-[13px]">
        Địa chỉ
        <input
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          className="mt-1 w-full rounded border border-[#d9d9d9] px-3 py-2"
        />
      </label>

      {error ? (
        <p className="rounded bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-brand px-4 py-2.5 text-[14px] font-bold text-white disabled:opacity-60"
      >
        {saving ? "Đang lưu..." : "Lưu About us"}
      </button>
    </form>
  );
}
