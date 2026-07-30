"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedImage(file: File, accept: string) {
  if (!accept || accept === "image/*") return file.type.startsWith("image/");
  const tokens = accept.split(",").map((item) => item.trim().toLowerCase());
  return tokens.some((token) => {
    if (token === "image/*") return file.type.startsWith("image/");
    if (token.startsWith(".")) {
      return file.name.toLowerCase().endsWith(token);
    }
    return file.type === token;
  });
}

export function ImageUploadField({
  label,
  hint = "PNG, JPG, WEBP, GIF",
  accept = "image/*",
  multiple = false,
  disabled = false,
  uploading = false,
  previewUrl = null,
  previewAlt = "Preview",
  selectedFile = null,
  onFileChange,
  onFilesChange,
  onClear,
  className,
  compact = false,
  previewAspectClassName = "aspect-[4/3]",
}: {
  label?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  /** Existing remote/public URL preview when no local file is selected */
  previewUrl?: string | null;
  previewAlt?: string;
  selectedFile?: File | null;
  onFileChange?: (file: File | null) => void;
  onFilesChange?: (files: File[]) => void;
  onClear?: () => void;
  className?: string;
  compact?: boolean;
  previewAspectClassName?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const objectUrl = useMemo(() => {
    if (!selectedFile) return null;
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const displayUrl = objectUrl ?? previewUrl;
  const busy = disabled || uploading;

  function applyFiles(files: File[]) {
    const images = files.filter((file) => isAcceptedImage(file, accept));
    if (images.length === 0) {
      setLocalError("Chỉ chấp nhận file ảnh.");
      return;
    }
    setLocalError(null);
    if (multiple && onFilesChange) {
      onFilesChange(images);
      return;
    }
    onFileChange?.(images[0] ?? null);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    applyFiles(files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    applyFiles(Array.from(event.dataTransfer.files ?? []));
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <span className="block text-[13px] font-medium text-[#444]">{label}</span>
      ) : null}

      {displayUrl ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border border-border-light bg-brand-light",
            compact ? "flex h-[100px] items-center justify-center p-3" : previewAspectClassName,
          )}
        >
          <Image
            src={displayUrl}
            alt={previewAlt}
            {...(compact
              ? { width: 220, height: 74 }
              : { fill: true, sizes: "400px" })}
            className={cn(
              compact ? "h-auto max-h-full w-auto object-contain" : "object-cover",
            )}
            unoptimized
          />
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          ) : null}
          {onClear && !busy ? (
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 rounded-full border border-border-light bg-white p-1.5 text-[#666] shadow-sm hover:text-red-600"
              title="Gỡ ảnh"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <label
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 text-center transition-colors",
          compact ? "min-h-[88px] py-3" : "min-h-[132px] py-5",
          busy
            ? "cursor-not-allowed border-border-light bg-[#fafafa] opacity-70"
            : dragging
              ? "border-brand bg-brand-light"
              : "border-border-light bg-white hover:border-brand hover:bg-brand-light",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={busy}
          onChange={onInputChange}
          className="sr-only"
        />
        <span
          className={cn(
            "mb-2 flex size-9 items-center justify-center rounded-full",
            dragging ? "bg-brand text-white" : "bg-brand-light text-brand",
          )}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : displayUrl ? (
            <Upload className="size-4" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </span>
        <span className="text-[13px] font-semibold text-[#222]">
          {uploading
            ? "Đang tải lên…"
            : dragging
              ? "Thả ảnh vào đây"
              : displayUrl
                ? "Đổi ảnh khác"
                : "Kéo thả ảnh vào đây"}
        </span>
        <span className="mt-1 text-[12px] text-[#888]">
          {uploading ? "Vui lòng đợi trong giây lát" : `hoặc bấm để chọn · ${hint}`}
        </span>
        {multiple && !uploading ? (
          <span className="mt-1 text-[11px] text-[#999]">Có thể chọn nhiều file</span>
        ) : null}
      </label>

      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border-light bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{selectedFile.name}</p>
            <p className="text-[11px] text-[#888]">{formatBytes(selectedFile.size)}</p>
          </div>
          {onClear && !busy ? (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-[12px] text-[#666] hover:text-red-600"
            >
              Gỡ
            </button>
          ) : null}
        </div>
      ) : null}

      {localError ? (
        <p className="text-[12px] text-red-600">{localError}</p>
      ) : null}
    </div>
  );
}
