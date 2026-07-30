"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandingSettings } from "@/data/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

async function upsertSetting(key: string, value: string) {
  const supabase = createAuthBrowserClient();
  const { error } = await supabase.from("site_settings").upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

async function uploadBrandAsset(file: File, filename: string) {
  const supabase = createAuthBrowserClient();
  const objectPath = `thegioithuocmoi/${filename}`;
  const { error } = await supabase.storage.from("images").upload(objectPath, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("images").getPublicUrl(objectPath);
  return data.publicUrl;
}

export function BrandingSettingsForm({ initial }: { initial: BrandingSettings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      let logoSrc = form.logoSrc;
      let faviconSrc = form.faviconSrc;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "png";
        logoSrc = await uploadBrandAsset(logoFile, `logo-brand.${ext}`);
      }
      if (faviconFile) {
        const ext = faviconFile.name.split(".").pop() || "png";
        faviconSrc = await uploadBrandAsset(faviconFile, `favicon-brand.${ext}`);
      }

      await Promise.all([
        upsertSetting("logo_src", logoSrc),
        upsertSetting("favicon_src", faviconSrc),
        upsertSetting("brand_primary", form.brandPrimary),
        upsertSetting("brand_light", form.brandLight),
        upsertSetting("brand_muted", form.brandMuted),
        upsertSetting("border_light", form.borderLight),
      ]);

      setForm((prev) => ({ ...prev, logoSrc, faviconSrc }));
      setLogoFile(null);
      setFaviconFile(null);
      setMessage("Đã lưu branding.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-3xl space-y-6 rounded-lg border border-[#ece4f3] bg-white p-5"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <ImageUploadField
          label="Logo"
          compact
          selectedFile={logoFile}
          previewUrl={form.logoSrc}
          previewAlt="Logo preview"
          onFileChange={setLogoFile}
          onClear={() => setLogoFile(null)}
          disabled={saving}
          hint="PNG / SVG khuyến nghị"
        />

        <ImageUploadField
          label="Favicon"
          compact
          selectedFile={faviconFile}
          previewUrl={form.faviconSrc}
          previewAlt="Favicon preview"
          onFileChange={setFaviconFile}
          onClear={() => setFaviconFile(null)}
          disabled={saving}
          hint="PNG vuông, ~48–128px"
          previewAspectClassName="aspect-square"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["brandPrimary", "Màu chủ đạo"],
            ["brandLight", "Nền header / nhẹ"],
            ["brandMuted", "Nền phụ"],
            ["borderLight", "Viền nhẹ"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 flex items-center justify-between text-[13px] font-medium">
              {label}
              <span
                className="size-5 rounded border border-black/10"
                style={{ background: form[key] }}
              />
            </span>
            <input
              type="color"
              value={form[key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className="h-10 w-full cursor-pointer rounded border border-[#d9d9d9] bg-white"
            />
            <input
              type="text"
              value={form[key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [key]: event.target.value }))
              }
              className="mt-2 w-full rounded border border-[#d9d9d9] px-3 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>
        ))}
      </div>

      <div className="rounded border border-[#ece4f3] p-4">
        <p className="mb-3 text-[13px] font-bold">Preview</p>
        <div className="flex flex-wrap gap-3">
          <span
            className="rounded px-3 py-2 text-[13px] font-bold text-white"
            style={{ background: form.brandPrimary }}
          >
            Primary button
          </span>
          <span
            className="rounded border px-3 py-2 text-[13px] font-bold"
            style={{
              color: form.brandPrimary,
              borderColor: form.brandPrimary,
              background: form.brandLight,
            }}
          >
            Soft surface
          </span>
        </div>
      </div>

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
        {saving ? "Đang lưu..." : "Lưu branding"}
      </button>
    </form>
  );
}
